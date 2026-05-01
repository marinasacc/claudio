/**
 * SISTEMA DE STOCK - Tu Textil
 *
 * Dos interfaces:
 * 1. Formulario de carga (empleados): URL base
 * 2. Panel de actualización TiendaNube (Marina): URL?page=actualizar
 *
 * Los datos se guardan en la hoja "Registros" del mismo spreadsheet.
 * Los productos/variantes se leen de la hoja "Productos".
 *
 * CLAVE: la unicidad es SKU + Nombre (un mismo SKU puede tener varios productos distintos).
 *
 * Columnas de Registros:
 * A: Fecha | B: Empleado | C: SKU | D: Producto | E: Variante
 * F: Tipo de Movimiento | G: Cantidad | H: Ubicación
 * I: Actualizado en TiendaNube | J: Comentarios
 */

// ============================================================
// CONFIGURACION TIENDANUBE
// ============================================================
var TIENDANUBE_STORE_ID = '858478';
var TIENDANUBE_TOKEN = ''; // Se carga desde PropertiesService

function getTiendaNubeToken_() {
  if (TIENDANUBE_TOKEN) return TIENDANUBE_TOKEN;
  TIENDANUBE_TOKEN = PropertiesService.getScriptProperties().getProperty('TIENDANUBE_TOKEN');
  return TIENDANUBE_TOKEN;
}

// ============================================================
// ROUTING
// ============================================================
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'home';

  if (page === 'home') {
    var tmpl = HtmlService.createTemplateFromFile('Home');
    tmpl.baseUrl = ScriptApp.getService().getUrl();
    return tmpl.evaluate()
      .setTitle('Tu Textil — Panel')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

if (page === 'mercadolibre') {
    return HtmlService.createHtmlOutputFromFile('MercadoLibre')
      .setTitle('MercadoLibre - Tu Textil')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  if (page === 'consultarmeli') {
    return HtmlService.createHtmlOutputFromFile('ConsultarMeli')
      .setTitle('Consultar Stock MeLi - Tu Textil')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  if (page === 'formulariov2') {
    return HtmlService.createHtmlOutputFromFile('FormularioV2')
      .setTitle('Actualización de Stock - Tu Textil')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  if (page === 'consultar') {
    return HtmlService.createHtmlOutputFromFile('Consultar')
      .setTitle('Consultar Stock - Tu Textil')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  if (page === 'vincular') {
    return HtmlService.createHtmlOutputFromFile('Vincular')
      .setTitle('Vincular MeLi ↔ TiendaNube - Tu Textil')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  if (page === 'publicar') {
    return HtmlService.createHtmlOutputFromFile('Publicar')
      .setTitle('Publicar en MeLi - Tu Textil')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  // Endpoint para sincronizar productos de TN + activar trigger diario
  if (page === 'sync') {
    var r = sincronizarProductos();
    // Asegurar que el trigger diario exista
    var triggers = ScriptApp.getProjectTriggers();
    var tieneTriger = false;
    for (var t = 0; t < triggers.length; t++) {
      if (triggers[t].getHandlerFunction() === 'sincronizacionDiariaAuto_') { tieneTriger = true; break; }
    }
    if (!tieneTriger) {
      crearTriggerSincronizacionDiaria();
      r.triggerCreado = true;
    }
    var html = '<html><body style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">' +
      '<h2>✅ Sincronización completada</h2>' +
      '<p><b>Productos en TiendaNube:</b> ' + r.totalTiendaNube + '</p>' +
      '<p><b>Nuevos agregados:</b> ' + r.nuevosAgregados + '</p>' +
      '<p><b>Eliminados:</b> ' + r.eliminados + '</p>' +
      (r.triggerCreado ? '<p>🕐 <b>Trigger diario activado</b> — se sincroniza solo a las 6 AM todos los días.</p>' : '') +
      '<br><a href="' + ScriptApp.getService().getUrl() + '?page=vincular">← Ir a Vincular</a>' +
      '</body></html>';
    return HtmlService.createHtmlOutput(html).setTitle('Sync - Tu Textil');
  }

  // Fallback: página de inicio
  var tmplFallback = HtmlService.createTemplateFromFile('Home');
  tmplFallback.baseUrl = ScriptApp.getService().getUrl();
  return tmplFallback.evaluate()
    .setTitle('Tu Textil — Panel')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

// ============================================================
// FUNCIONES DEL FORMULARIO (server-side)
// ============================================================

function getProductos() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  var data = sheet.getDataRange().getValues();
  var seen = {};
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var sku = data[i][0].toString().trim();
    var nombre = data[i][1].toString().trim();
    var key = sku + '|||' + nombre;

    if (sku && !seen[key]) {
      seen[key] = true;
      result.push({ sku: sku, nombre: nombre });
    }
  }

  result.sort(function(a, b) {
    var cmp = a.sku.localeCompare(b.sku);
    return cmp !== 0 ? cmp : a.nombre.localeCompare(b.nombre);
  });

  return result;
}

function getVariantes(sku, nombre) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  var data = sheet.getDataRange().getValues();
  var variantes = [];

  for (var i = 1; i < data.length; i++) {
    var rowSku = data[i][0].toString().trim();
    var rowNombre = data[i][1].toString().trim();
    var rowVariante = data[i][2].toString().trim();

    if (rowSku === sku && rowNombre === nombre) {
      if (rowVariante && variantes.indexOf(rowVariante) === -1) {
        variantes.push(rowVariante);
      }
    }
  }

  variantes.sort();
  return variantes;
}

function guardarRegistro(datos) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');

  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Registros');
    sheet.appendRow([
      'Fecha', 'Empleado', 'SKU', 'Producto', 'Variante',
      'Tipo de Movimiento', 'Cantidad', 'Ubicación', 'Actualizado en TiendaNube', 'Comentarios'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Asegurar que existen las columnas I y J
  var headers = sheet.getRange(1, 1, 1, 10).getValues()[0];
  if (headers[8] !== 'Actualizado en TiendaNube') {
    sheet.getRange(1, 9).setValue('Actualizado en TiendaNube');
    sheet.getRange(1, 9).setFontWeight('bold');
  }
  if (headers[9] !== 'Comentarios') {
    sheet.getRange(1, 10).setValue('Comentarios');
    sheet.getRange(1, 10).setFontWeight('bold');
  }

  sheet.appendRow([
    new Date(),
    datos.empleado,
    datos.sku,
    datos.nombre,
    datos.variante,
    datos.tipo,
    datos.cantidad,
    datos.ubicacion,
    '', // Columna I: Actualizado en TiendaNube
    ''  // Columna J: Comentarios
  ]);

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

  return { success: true, message: 'Stock registrado correctamente' };
}

/**
 * Guarda múltiples registros de una vez.
 * listaMovimientos: array de objetos con {empleado, sku, nombre, variante, tipo, cantidad, ubicacion}
 */
function guardarMultiplesRegistros(listaMovimientos) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');

  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Registros');
    sheet.appendRow([
      'Fecha', 'Empleado', 'SKU', 'Producto', 'Variante',
      'Tipo de Movimiento', 'Cantidad', 'Ubicación', 'Actualizado en TiendaNube', 'Comentarios'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  var ahora = new Date();
  var filas = [];
  for (var i = 0; i < listaMovimientos.length; i++) {
    var d = listaMovimientos[i];
    filas.push([ahora, d.empleado, d.sku, d.nombre, d.variante, d.tipo, d.cantidad, d.ubicacion, '', '']);
  }

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, filas.length, 10).setValues(filas);
  sheet.getRange(lastRow + 1, 1, filas.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

  return { success: true, message: filas.length + ' movimiento' + (filas.length !== 1 ? 's' : '') + ' registrado' + (filas.length !== 1 ? 's' : '') + ' correctamente' };
}

// ============================================================
// FUNCIONES DEL ACTUALIZADOR (server-side)
// ============================================================

/**
 * Obtiene los registros pendientes de actualizar en TiendaNube
 */
function getRegistrosPendientes() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var pendientes = [];

  for (var i = 1; i < data.length; i++) {
    var actualizado = data[i][8]; // Columna I
    if (!actualizado || actualizado === '') {
      pendientes.push({
        fila: i + 1,
        fecha: data[i][0] ? Utilities.formatDate(new Date(data[i][0]), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : '',
        empleado: data[i][1] || '',
        sku: data[i][2] ? data[i][2].toString().trim() : '',
        producto: data[i][3] || '',
        variante: data[i][4] ? data[i][4].toString().trim() : '',
        tipo: data[i][5] || '',
        cantidad: parseInt(data[i][6]) || 0,
        ubicacion: data[i][7] || ''
      });
    }
  }

  return pendientes;
}

/**
 * Busca un producto en TiendaNube por SKU y devuelve el variant_id y stock actual
 */
function buscarProductoTiendaNube_(sku, variante) {
  var token = getTiendaNubeToken_();
  if (!token) throw new Error('Token de TiendaNube no configurado. Ejecutar setTokenManual() primero.');

  var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID + '/products?q=' + encodeURIComponent(sku) + '&per_page=50';
  var response = UrlFetchApp.fetch(url, {
    headers: {
      'Authentication': 'bearer ' + token,
      'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Error buscando producto: ' + response.getContentText());
  }

  var products = JSON.parse(response.getContentText());

  for (var p = 0; p < products.length; p++) {
    var product = products[p];
    var variants = product.variants || [];

    for (var v = 0; v < variants.length; v++) {
      var variant = variants[v];

      if (variant.sku !== sku) continue;

      var variantValues = (variant.values || []).map(function(val) {
        return val.es || val.pt || '';
      });
      var variantName = variantValues.join(' / ');

      if (variante === '(Sin variante)' && variantValues.length === 0) {
        return {
          product_id: product.id,
          variant_id: variant.id,
          stock: variant.stock || 0,
          nombre: product.name.es || product.name.pt || ''
        };
      }

      if (variantName.toLowerCase() === variante.toLowerCase() ||
          (variantValues.length === 1 && variantValues[0].toLowerCase() === variante.toLowerCase())) {
        return {
          product_id: product.id,
          variant_id: variant.id,
          stock: variant.stock || 0,
          nombre: product.name.es || product.name.pt || ''
        };
      }
    }
  }

  return null;
}

/**
 * Consulta el stock actual en TiendaNube para una lista de registros.
 * Devuelve los registros enriquecidos con stockActual y stockNuevo.
 */
function consultarStockActual(registros) {
  var resultados = [];

  for (var i = 0; i < registros.length; i++) {
    var reg = registros[i];
    var resultado = {
      fila: reg.fila,
      fecha: reg.fecha,
      empleado: reg.empleado,
      sku: reg.sku,
      producto: reg.producto,
      variante: reg.variante,
      tipo: reg.tipo,
      cantidad: reg.cantidad,
      ubicacion: reg.ubicacion,
      stockActual: null,
      stockNuevo: null,
      error: null
    };

    try {
      var producto = buscarProductoTiendaNube_(reg.sku, reg.variante);

      if (!producto) {
        resultado.error = 'Producto no encontrado en TiendaNube: ' + reg.sku + ' / ' + reg.variante;
      } else {
        var stockActual = producto.stock || 0;
        var stockNuevo = stockActual;

        switch (reg.tipo) {
          case 'Ingreso':
            stockNuevo = stockActual + reg.cantidad;
            break;
          case 'Actualizacion':
            stockNuevo = reg.cantidad;
            break;
          case 'Vendido':
            stockNuevo = Math.max(0, stockActual - reg.cantidad);
            break;
          case 'Full':
            stockNuevo = Math.max(0, stockActual - reg.cantidad);
            break;
          default:
            resultado.error = 'Tipo de movimiento desconocido: ' + reg.tipo;
        }

        if (!resultado.error) {
          resultado.stockActual = stockActual;
          resultado.stockNuevo = stockNuevo;
          resultado.productId = producto.product_id;
          resultado.variantId = producto.variant_id;
        }
      }
    } catch (e) {
      resultado.error = e.message || e.toString();
    }

    resultados.push(resultado);

    // Pausa para no saturar la API
    if (i < registros.length - 1) {
      Utilities.sleep(300);
    }
  }

  return resultados;
}

/**
 * Actualiza el stock de una variante en TiendaNube
 */
function actualizarStockTiendaNube_(productId, variantId, nuevoStock) {
  var token = getTiendaNubeToken_();

  var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID + '/products/' + productId + '/variants/' + variantId;
  var response = UrlFetchApp.fetch(url, {
    method: 'put',
    headers: {
      'Authentication': 'bearer ' + token,
      'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ stock: nuevoStock }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Error actualizando stock: ' + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}

/**
 * Procesa los registros seleccionados.
 * - seleccionados: array de objetos con datos + productId/variantId/stockNuevo
 * - noSeleccionados: array de objetos que se marcan como "stock no actualizado"
 */
function procesarRegistrosSeleccionados(seleccionados, noSeleccionados) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');
  var ahora = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
  var resultados = [];

  // 1. Procesar los SELECCIONADOS (actualizar en TiendaNube)
  for (var i = 0; i < seleccionados.length; i++) {
    var reg = seleccionados[i];

    try {
      if (reg.error) {
        // Tiene error de consulta previa — marcar con error en rojo
        sheet.getRange(reg.fila, 9).setValue(ahora);
        sheet.getRange(reg.fila, 10).setValue(reg.error);
        sheet.getRange(reg.fila, 1, 1, 10).setBackground('#ffcdd2'); // Rojo claro

        resultados.push({
          fila: reg.fila,
          success: false,
          sku: reg.sku,
          variante: reg.variante,
          error: reg.error
        });
        continue;
      }

      // Actualizar en TiendaNube
      actualizarStockTiendaNube_(reg.productId, reg.variantId, reg.stockNuevo);

      // Marcar como actualizado (sin color = exitoso)
      sheet.getRange(reg.fila, 9).setValue(ahora);
      sheet.getRange(reg.fila, 10).setValue('');

      resultados.push({
        fila: reg.fila,
        success: true,
        sku: reg.sku,
        variante: reg.variante,
        stockAnterior: reg.stockActual,
        stockNuevo: reg.stockNuevo,
        tipo: reg.tipo
      });

    } catch (e) {
      var errorMsg = e.message || e.toString();
      // Error de API — marcar en rojo con comentario
      sheet.getRange(reg.fila, 9).setValue(ahora);
      sheet.getRange(reg.fila, 10).setValue(errorMsg);
      sheet.getRange(reg.fila, 1, 1, 10).setBackground('#ffcdd2'); // Rojo claro

      resultados.push({
        fila: reg.fila,
        success: false,
        sku: reg.sku,
        variante: reg.variante,
        error: errorMsg
      });
    }

    // Pausa para no saturar la API
    if (i < seleccionados.length - 1) {
      Utilities.sleep(500);
    }
  }

  // 2. Procesar los NO SELECCIONADOS (marcar como gris con comentario)
  for (var j = 0; j < noSeleccionados.length; j++) {
    var reg2 = noSeleccionados[j];

    sheet.getRange(reg2.fila, 9).setValue(ahora);
    sheet.getRange(reg2.fila, 10).setValue('stock no actualizado');
    sheet.getRange(reg2.fila, 1, 1, 10).setBackground('#e0e0e0'); // Gris

    resultados.push({
      fila: reg2.fila,
      success: true,
      sku: reg2.sku,
      variante: reg2.variante,
      omitido: true
    });
  }

  return resultados;
}

// ============================================================
// SINCRONIZACION DE PRODUCTOS
// ============================================================

/**
 * Trae TODOS los productos de TiendaNube (paginado).
 * Devuelve array de {sku, nombre, variante} por cada SKU+variante.
 */
function obtenerTodosProductosTiendaNube_() {
  var token = getTiendaNubeToken_();
  if (!token) throw new Error('Token de TiendaNube no configurado.');

  var todosProductos = [];
  var page = 1;
  var perPage = 200;
  var hayMas = true;

  while (hayMas) {
    var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID +
      '/products?per_page=' + perPage + '&page=' + page;

    var response = UrlFetchApp.fetch(url, {
      headers: {
        'Authentication': 'bearer ' + token,
        'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();

    // 404 = ya no hay más páginas
    if (code === 404) {
      hayMas = false;
      break;
    }

    if (code !== 200) {
      throw new Error('Error leyendo productos (página ' + page + '): ' + response.getContentText());
    }

    var products = JSON.parse(response.getContentText());

    if (products.length === 0) {
      hayMas = false;
      break;
    }

    for (var p = 0; p < products.length; p++) {
      var product = products[p];
      var nombre = product.name.es || product.name.pt || '';
      var variants = product.variants || [];

      for (var v = 0; v < variants.length; v++) {
        var variant = variants[v];
        var sku = variant.sku || '';
        if (!sku) continue;

        var variantValues = (variant.values || []).map(function(val) {
          return val.es || val.pt || '';
        });
        var variantName = variantValues.length > 0 ? variantValues.join(' / ') : '(Sin variante)';

        todosProductos.push({
          sku: sku,
          nombre: nombre,
          variante: variantName
        });
      }
    }

    page++;
    Utilities.sleep(300); // Respetar rate limit
  }

  return todosProductos;
}

/**
 * Sincroniza productos: compara TiendaNube con el Sheet.
 * - Agrega los nuevos (están en TN pero no en Sheet)
 * - Elimina los que ya no existen (están en Sheet pero no en TN)
 * Devuelve un resumen de lo que hizo.
 */
function sincronizarProductos() {
  // 1. Traer todos los productos de TiendaNube
  var productosTN = obtenerTodosProductosTiendaNube_();

  // Crear set de claves de TiendaNube
  var clavesTN = {};
  for (var j = 0; j < productosTN.length; j++) {
    var p = productosTN[j];
    var key = p.sku + '|||' + p.nombre + '|||' + p.variante;
    clavesTN[key] = true;
  }

  // 2. Leer productos actuales del Sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  if (!sheet) throw new Error('No existe la pestaña "Productos"');

  var dataSheet = sheet.getDataRange().getValues();
  var existentes = {};
  var filasAEliminar = []; // Filas que ya no existen en TN (de abajo hacia arriba)

  for (var i = 1; i < dataSheet.length; i++) {
    var keySheet = dataSheet[i][0].toString().trim() + '|||' +
                   dataSheet[i][1].toString().trim() + '|||' +
                   dataSheet[i][2].toString().trim();
    existentes[keySheet] = true;

    // Si no existe en TN, marcar para eliminar
    if (!clavesTN[keySheet]) {
      filasAEliminar.push({
        fila: i + 1, // 1-indexed
        sku: dataSheet[i][0].toString().trim(),
        nombre: dataSheet[i][1].toString().trim(),
        variante: dataSheet[i][2].toString().trim()
      });
    }
  }

  var totalExistentes = Object.keys(existentes).length;

  // 3. Encontrar los nuevos (están en TN pero no en el Sheet)
  var nuevos = [];
  for (var k = 0; k < productosTN.length; k++) {
    var p2 = productosTN[k];
    var key2 = p2.sku + '|||' + p2.nombre + '|||' + p2.variante;
    if (!existentes[key2]) {
      nuevos.push([p2.sku, p2.nombre, p2.variante]);
      existentes[key2] = true; // Evitar duplicados
    }
  }

  // 4. Eliminar filas que ya no existen en TN (de abajo hacia arriba para no romper indices)
  filasAEliminar.sort(function(a, b) { return b.fila - a.fila; });
  for (var d = 0; d < filasAEliminar.length; d++) {
    sheet.deleteRow(filasAEliminar[d].fila);
  }

  // 5. Agregar los nuevos al Sheet
  if (nuevos.length > 0) {
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, nuevos.length, 3).setValues(nuevos);
  }

  return {
    totalTiendaNube: productosTN.length,
    totalSheetAntes: totalExistentes,
    nuevosAgregados: nuevos.length,
    eliminados: filasAEliminar.length,
    nuevos: nuevos.slice(0, 50).map(function(n) {
      return { sku: n[0], nombre: n[1], variante: n[2] };
    }),
    eliminadosDetalle: filasAEliminar.slice(0, 50).map(function(e) {
      return { sku: e.sku, nombre: e.nombre, variante: e.variante };
    }),
    hayMasNuevos: nuevos.length > 50,
    hayMasEliminados: filasAEliminar.length > 50
  };
}

/**
 * Crea un trigger diario para sincronizar productos de TiendaNube.
 * Ejecutar UNA sola vez desde el editor (▶️ ejecutar).
 * Se ejecuta todos los días entre las 6 y 7 AM Argentina.
 */
function crearTriggerSincronizacionDiaria() {
  // Primero borrar triggers anteriores para no duplicar
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var handler = triggers[i].getHandlerFunction();
    if (handler === 'sincronizacionDiariaAuto_' || handler === 'sincronizacionMediodiaAuto_') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Trigger 1: 6 AM
  ScriptApp.newTrigger('sincronizacionDiariaAuto_')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .nearMinute(0)
    .inTimezone('America/Argentina/Buenos_Aires')
    .create();

  // Trigger 2: 14 HS (2 PM)
  ScriptApp.newTrigger('sincronizacionMediodiaAuto_')
    .timeBased()
    .everyDays(1)
    .atHour(14)
    .nearMinute(0)
    .inTimezone('America/Argentina/Buenos_Aires')
    .create();

  Logger.log('Triggers creados: sincronización a las 6 AM y 14 HS');
}

/**
 * Función que ejecuta el trigger diario.
 * Sincroniza productos y stock Full de MeLi.
 */
function sincronizacionDiariaAuto_() {
  try {
    var resultado = sincronizarProductos();
    Logger.log('Sincronización productos: ' +
      resultado.nuevosAgregados + ' nuevos, ' +
      resultado.eliminados + ' eliminados, ' +
      resultado.totalTiendaNube + ' productos en TN');
  } catch (e) {
    Logger.log('Error en sincronización de productos: ' + e.message);
  }

  try {
    var rFull = sincronizarStockFull_();
    Logger.log('Sincronización Full: ' + rFull.total + ' publicaciones Full guardadas');
  } catch (e2) {
    Logger.log('Error en sincronización de stock Full: ' + e2.message);
  }

  try {
    actualizarPreciosVinculaciones();
  } catch (e3) {
    Logger.log('Error actualizando precios Vinculaciones: ' + e3.message);
  }
}

/**
 * Función que ejecuta el segundo trigger diario (14 HS).
 * Misma lógica que el de las 6 AM.
 */
function sincronizacionMediodiaAuto_() {
  sincronizacionDiariaAuto_();
}

/**
 * EJECUTAR DESDE EL EDITOR (versión pública, sin underscore).
 * Sincroniza el stock Full de todas las publicaciones de MeLi a la hoja "StockFull".
 */
function sincronizarStockFull() {
  var r = sincronizarStockFull_();
  Logger.log('✅ Listo: ' + r.total + ' publicaciones Full guardadas en la hoja StockFull');
  return r;
}

/**
 * Recorre todas las publicaciones de MeLi, filtra las de fulfillment (Full)
 * y escribe el stock en la hoja "StockFull" por SKU + Variante.
 * Columnas: SKU | Variante | Stock Full | MLA ID | Variacion ID | Ultima Actualizacion
 */
function sincronizarStockFull_() {
  var itemsMeli = obtenerTodosItemsMeli_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('StockFull');

  if (!sheet) {
    sheet = ss.insertSheet('StockFull');
  } else {
    sheet.clear();
  }

  sheet.appendRow(['SKU', 'Variante', 'Stock Full', 'MLA ID', 'Variacion ID', 'Ultima Actualizacion']);
  sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#e8f5e9');
  sheet.setFrozenRows(1);

  var ahora = new Date();
  var filas = [];

  // Filtrar solo items fulfillment (con o sin SKU — las vinculaciones
  // se resuelven por MLA + variacionId, no por SKU)
  var itemsFull = [];
  for (var i = 0; i < itemsMeli.length; i++) {
    var item = itemsMeli[i];
    if (item.logisticType !== 'fulfillment') continue;
    itemsFull.push(item);
  }

  // Para cada item Full, consultar stock real por almacén
  for (var f = 0; f < itemsFull.length; f++) {
    var item = itemsFull[f];
    var stockFull = 0;

    try {
      if (item.variacionId) {
        var varStock = obtenerStockVariacionPorAlmacen_(item.itemId, item.variacionId, item.userProductId);
        if (varStock) {
          stockFull = varStock.full;
        } else {
          stockFull = 0;
        }
      } else {
        var itemStock = obtenerStockPorAlmacen_(item.itemId, item.userProductId);
        if (itemStock) {
          stockFull = itemStock.full;
        } else {
          stockFull = 0;
        }
      }
    } catch (e) {
      stockFull = 0;
      Logger.log('Error stock almacén ' + item.itemId + ': ' + e.message);
    }

    filas.push([
      item.sku,
      item.variante || '',
      stockFull,
      item.itemId,
      item.variacionId || '',
      ahora
    ]);

    // Pausa cada 5 items para no saturar la API
    if (f % 5 === 4 && f < itemsFull.length - 1) Utilities.sleep(500);
  }

  if (filas.length > 0) {
    sheet.getRange(2, 1, filas.length, 6).setValues(filas);
    sheet.getRange(2, 6, filas.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }

  Logger.log('StockFull sincronizado: ' + filas.length + ' publicaciones');
  return { total: filas.length };
}

/**
 * Devuelve un mapa indexado por "SKU_TN|||Variante_TN" con el stock Full.
 * Usa la hoja Vinculaciones para saber qué publicación Full de MeLi
 * corresponde a cada SKU+Variante de TiendaNube, y la hoja StockFull para el stock.
 */
function leerMapaStockFull_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Leer stock Full indexado por MLA_ID + Variacion_ID
  var sheetFull = ss.getSheetByName('StockFull');
  if (!sheetFull) return {};
  var dataFull = sheetFull.getDataRange().getValues();
  // Headers StockFull: SKU | Variante | Stock Full | MLA ID | Variacion ID | Ultima Actualizacion
  var stockPorItem = {};
  for (var i = 1; i < dataFull.length; i++) {
    var mlaId = (dataFull[i][3] || '').toString().trim();
    var varId = (dataFull[i][4] || '').toString().trim();
    var stock = parseInt(dataFull[i][2]) || 0;
    if (!mlaId) continue;
    var key = mlaId + '|||' + varId;
    stockPorItem[key] = (stockPorItem[key] || 0) + stock;
  }

  // 2. Leer Vinculaciones: traducir MeLi → TiendaNube
  var sheetVinc = ss.getSheetByName('Vinculaciones');
  if (!sheetVinc) return {};
  var dataVinc = sheetVinc.getDataRange().getValues();
  // Headers Vinculaciones: MLA ID | Publicacion | SKU MeLi | Variante MeLi | Stock | Precio | Tipo | SKU — Variante TN | Variacion ID | SKU Actualizado

  var mapa = {};
  for (var j = 1; j < dataVinc.length; j++) {
    var mlaIdV = (dataVinc[j][0] || '').toString().trim();
    var tipo = (dataVinc[j][6] || '').toString().trim();
    var vinculacion = (dataVinc[j][7] || '').toString().trim();
    var varIdV = (dataVinc[j][8] || '').toString().trim();

    // Solo publicaciones Full que estén vinculadas
    if (tipo !== 'Full' || !vinculacion) continue;

    // Parsear "FV161IX3 — Pack Blanco" → sku=FV161IX3, variante=Pack Blanco
    var partes = vinculacion.split(' — ');
    var skuTN = (partes[0] || '').trim();
    var varianteTN = partes.length > 1 ? partes.slice(1).join(' — ').trim() : '';

    // Buscar stock en StockFull por MLA ID + Variacion ID
    var keyItem = mlaIdV + '|||' + varIdV;
    var stockVal = stockPorItem.hasOwnProperty(keyItem) ? stockPorItem[keyItem] : null;

    if (stockVal === null) continue; // No tiene stock Full registrado

    // Guardar con clave de TiendaNube
    var keyTN = skuTN.toUpperCase() + '|||' + varianteTN.toUpperCase();
    mapa[keyTN] = (mapa[keyTN] || 0) + stockVal;

    // También guardar clave solo SKU (para productos sin variante en MeLi)
    if (!varianteTN || varianteTN === '(Sin variante)') {
      var keySku = skuTN.toUpperCase() + '|||';
      mapa[keySku] = (mapa[keySku] || 0) + stockVal;
    }
  }

  return mapa;
}

// ============================================================
// FUNCIONES DE CONSULTA DE STOCK (server-side)
// ============================================================

/**
 * Busca un SKU en TiendaNube y devuelve todas las variantes con su stock.
 * Consulta directo a la API para tener datos siempre actualizados.
 */
function consultarStockPorSKU(skuBuscado) {
  var token = getTiendaNubeToken_();
  if (!token) throw new Error('Token de TiendaNube no configurado.');

  skuBuscado = skuBuscado.toString().trim();
  if (!skuBuscado) throw new Error('Ingresá un SKU para consultar.');

  var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID +
    '/products?q=' + encodeURIComponent(skuBuscado) + '&per_page=50';

  var response = UrlFetchApp.fetch(url, {
    headers: {
      'Authentication': 'bearer ' + token,
      'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Error consultando TiendaNube: ' + response.getContentText());
  }

  var products = JSON.parse(response.getContentText());
  var resultados = [];

  for (var p = 0; p < products.length; p++) {
    var product = products[p];
    var nombre = product.name.es || product.name.pt || '';
    var variants = product.variants || [];

    for (var v = 0; v < variants.length; v++) {
      var variant = variants[v];
      var sku = variant.sku || '';

      // Solo incluir variantes cuyo SKU coincida exactamente
      if (sku !== skuBuscado) continue;

      var variantValues = (variant.values || []).map(function(val) {
        return val.es || val.pt || '';
      });
      var variantName = variantValues.length > 0 ? variantValues.join(' / ') : '(Sin variante)';

      resultados.push({
        nombre: nombre,
        variante: variantName,
        stock: variant.stock,
        precio: variant.price,
        sku: sku
      });
    }
  }

  if (resultados.length === 0) {
    return { encontrado: false, sku: skuBuscado, variantes: [] };
  }

  return {
    encontrado: true,
    sku: skuBuscado,
    nombre: resultados[0].nombre,
    variantes: resultados
  };
}

/**
 * Consulta completa de stock: TiendaNube (API) + ubicaciones de Registros + últimos 10 movimientos.
 */
function consultarStockCompleto(skuBuscado) {
  skuBuscado = (skuBuscado || '').toString().trim();
  if (!skuBuscado) throw new Error('Ingresá un SKU para consultar.');

  // 1. Stock de TiendaNube (API en tiempo real)
  var tnData = null;
  try {
    tnData = consultarStockPorSKU(skuBuscado);
  } catch (e) {
    tnData = { encontrado: false, sku: skuBuscado, variantes: [] };
  }

  // 2. Stock por ubicación desde Registros
  var regSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');
  var stockLocal = 0;
  var stockDeposito = 0;
  var historial = [];

  if (regSheet) {
    var data = regSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var skuReg = (data[i][2] || '').toString().trim();
      if (skuReg.toUpperCase() !== skuBuscado.toUpperCase()) continue;

      var tipo = (data[i][5] || '').toString().trim();
      var cantidad = parseFloat(data[i][6]) || 0;
      var ubicacion = (data[i][7] || '').toString().trim();

      // Acumular stock por ubicación
      if (ubicacion.toLowerCase().indexOf('local') !== -1) {
        if (tipo === 'Ingreso') stockLocal += cantidad;
        else if (tipo === 'Vendido' || tipo === 'Full') stockLocal -= cantidad;
        else if (tipo === 'Actualizacion') stockLocal = cantidad;
      } else if (ubicacion.toLowerCase().indexOf('dep') !== -1) {
        if (tipo === 'Ingreso') stockDeposito += cantidad;
        else if (tipo === 'Vendido' || tipo === 'Full') stockDeposito -= cantidad;
        else if (tipo === 'Actualizacion') stockDeposito = cantidad;
      }

      // Guardar para historial
      var fechaRaw = data[i][0];
      var fechaStr = '';
      if (fechaRaw) {
        try {
          fechaStr = Utilities.formatDate(new Date(fechaRaw), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');
        } catch (e) {
          fechaStr = fechaRaw.toString();
        }
      }

      historial.push({
        fecha: fechaStr,
        empleado: (data[i][1] || '').toString(),
        producto: (data[i][3] || '').toString(),
        variante: (data[i][4] || '').toString(),
        tipo: tipo,
        cantidad: cantidad,
        ubicacion: ubicacion,
        comentarios: (data[i][9] || '').toString()
      });
    }
  }

  // Últimos 10 movimientos (más recientes primero)
  historial.reverse();
  var ultimos10 = historial.slice(0, 10);

  return {
    encontrado: tnData.encontrado,
    sku: skuBuscado,
    nombre: tnData.nombre || '',
    variantes: tnData.variantes || [],
    stockLocal: Math.max(0, stockLocal),
    stockDeposito: Math.max(0, stockDeposito),
    historial: ultimos10
  };
}

/**
 * Obtiene los últimos 10 movimientos de un SKU desde la hoja Registros.
 * Incluye variante en el detalle.
 */
function obtenerHistorialSKU(skuBuscado, limite) {
  skuBuscado = (skuBuscado || '').toString().trim();
  if (!skuBuscado) return [];
  limite = parseInt(limite) || 10;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var historial = [];

  for (var i = 1; i < data.length; i++) {
    var skuReg = (data[i][2] || '').toString().trim();
    if (skuReg.toUpperCase() !== skuBuscado.toUpperCase()) continue;

    var fechaRaw = data[i][0];
    var fechaStr = '';
    if (fechaRaw) {
      try {
        fechaStr = Utilities.formatDate(new Date(fechaRaw), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');
      } catch (e) {
        fechaStr = fechaRaw.toString();
      }
    }

    historial.push({
      fecha: fechaStr,
      empleado: (data[i][1] || '').toString(),
      variante: (data[i][4] || '').toString(),
      tipo: (data[i][5] || '').toString().trim(),
      cantidad: parseFloat(data[i][6]) || 0,
      ubicacion: (data[i][7] || '').toString(),
      comentarios: (data[i][9] || '').toString()
    });
  }

  // Más recientes primero, limitado por parámetro
  historial.reverse();
  return historial.slice(0, limite);
}

// ============================================================
// FUNCIONES DEL FORMULARIO V2 (stock por ubicación)
// ============================================================

/**
 * Devuelve un mapa "SKU_TN|||Variante_TN" → precio MeLi mínimo vinculado.
 */
function leerMapaPreciosMeli_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetVinc = ss.getSheetByName('Vinculaciones');
  if (!sheetVinc) return {};
  var dataVinc = sheetVinc.getDataRange().getValues();
  // Headers: MLA ID | Publicacion | SKU MeLi | Variante MeLi | Stock | Precio | Tipo | SKU — Variante TN | Variacion ID | SKU Actualizado
  var mapa = {};
  for (var j = 1; j < dataVinc.length; j++) {
    var precio = parseFloat(dataVinc[j][5]) || 0;
    var vinculacion = (dataVinc[j][7] || '').toString().trim();
    if (!vinculacion || !precio) continue;
    var partes = vinculacion.split(' — ');
    var skuTN = (partes[0] || '').trim().toUpperCase();
    var varianteTN = partes.length > 1 ? partes.slice(1).join(' — ').trim().toUpperCase() : '';
    var keyTN = skuTN + '|||' + varianteTN;
    if (!mapa.hasOwnProperty(keyTN) || precio < mapa[keyTN]) mapa[keyTN] = precio;
    if (!varianteTN || varianteTN === '(SIN VARIANTE)') {
      var keySku = skuTN + '|||';
      if (!mapa.hasOwnProperty(keySku) || precio < mapa[keySku]) mapa[keySku] = precio;
    }
  }
  return mapa;
}

/**
 * Devuelve las variantes de un SKU con el stock por ubicación (Local/Depósito)
 * y el stock actual en TiendaNube (consultando la API en tiempo real).
 */
function getVariantesConStock(sku, nombre) {
  // 1. Obtener variantes del producto
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  var data = sheet.getDataRange().getValues();
  var variantes = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === sku && data[i][1].toString().trim() === nombre) {
      var v = data[i][2].toString().trim();
      if (v && variantes.indexOf(v) === -1) variantes.push(v);
    }
  }
  variantes.sort();

  // 2. Leer stock por ubicación de la hoja StockUbicacion
  var stockSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('StockUbicacion');
  var stockMap = {}; // clave: variante → { Local: X, Deposito: Y }
  if (stockSheet) {
    var stockData = stockSheet.getDataRange().getValues();
    for (var j = 1; j < stockData.length; j++) {
      var rowSku = stockData[j][0].toString().trim();
      var rowVariante = stockData[j][2].toString().trim();
      var rowUbicacion = stockData[j][3].toString().trim();
      var rowStock = parseInt(stockData[j][4]) || 0;
      if (rowSku === sku) {
        if (!stockMap[rowVariante]) stockMap[rowVariante] = {};
        stockMap[rowVariante][rowUbicacion] = rowStock;
      }
    }
  }

  // 3. Consultar stock y precio de TiendaNube (en tiempo real)
  var stockTN = {};  // clave: variante → stock
  var precioTN = {}; // clave: variante → precio
  try {
    var token = getTiendaNubeToken_();
    if (token) {
      var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID +
        '/products?q=' + encodeURIComponent(sku) + '&per_page=50';
      var response = UrlFetchApp.fetch(url, {
        headers: {
          'Authentication': 'bearer ' + token,
          'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
          'Content-Type': 'application/json'
        },
        muteHttpExceptions: true
      });
      if (response.getResponseCode() === 200) {
        var products = JSON.parse(response.getContentText());
        for (var p = 0; p < products.length; p++) {
          var variants = products[p].variants || [];
          for (var vv = 0; vv < variants.length; vv++) {
            if (variants[vv].sku === sku) {
              var variantValues = (variants[vv].values || []).map(function(val) {
                return val.es || val.pt || '';
              });
              var variantName = variantValues.length > 0 ? variantValues.join(' / ') : '(Sin variante)';
              stockTN[variantName] = variants[vv].stock || 0;
              precioTN[variantName] = parseFloat(variants[vv].price) || null;
            }
          }
        }
      }
    }
  } catch (e) {
    // Si falla la consulta a TN, no bloquear — simplemente queda null
  }

  // 4. Leer mapa de stock Full (usa Vinculaciones para traducir MeLi → TN)
  var mapaFull = leerMapaStockFull_();

  // 5. Leer mapa de ventas 30d
  var mapaVentas = leerMapaVentas30d_();

  // 5b. Leer mapa de precios MeLi
  var mapaPreciosMeli = leerMapaPreciosMeli_();

  // 6. Armar resultado
  var result = [];
  for (var k = 0; k < variantes.length; k++) {
    var stocks = stockMap[variantes[k]] || {};

    // Stock Full: buscar por SKU + Variante de TiendaNube
    var skuUp = sku.toUpperCase();
    var varUp = variantes[k].toUpperCase();
    var claveFull = skuUp + '|||' + varUp;
    var clavesSinVar = skuUp + '|||(SIN VARIANTE)';
    var claveSoloSku = skuUp + '|||';
    var stockFullVal;
    if (mapaFull.hasOwnProperty(claveFull)) {
      stockFullVal = mapaFull[claveFull];
    } else if (mapaFull.hasOwnProperty(clavesSinVar)) {
      stockFullVal = mapaFull[clavesSinVar];
    } else if (mapaFull.hasOwnProperty(claveSoloSku)) {
      stockFullVal = mapaFull[claveSoloSku];
    } else {
      stockFullVal = 'FALTA_VINCULAR';
    }

    // Ventas 30d: buscar por SKU + Variante (mismo sistema de claves)
    var ventas30dVal = null;
    if (mapaVentas.hasOwnProperty(claveFull)) {
      ventas30dVal = mapaVentas[claveFull];
    } else if (mapaVentas.hasOwnProperty(clavesSinVar)) {
      ventas30dVal = mapaVentas[clavesSinVar];
    } else if (mapaVentas.hasOwnProperty(claveSoloSku)) {
      ventas30dVal = mapaVentas[claveSoloSku];
    }

    // Precio MeLi: buscar por clave TN
    var precioMeliVal = null;
    if (mapaPreciosMeli.hasOwnProperty(claveFull)) precioMeliVal = mapaPreciosMeli[claveFull];
    else if (mapaPreciosMeli.hasOwnProperty(clavesSinVar)) precioMeliVal = mapaPreciosMeli[clavesSinVar];
    else if (mapaPreciosMeli.hasOwnProperty(claveSoloSku)) precioMeliVal = mapaPreciosMeli[claveSoloSku];

    result.push({
      variante: variantes[k],
      stockLocal: stocks['Local'] || 0,
      stockDeposito: stocks['Deposito'] || 0,
      stockTiendaNube: stockTN.hasOwnProperty(variantes[k]) ? stockTN[variantes[k]] : null,
      stockFull: stockFullVal,
      ventas30d: ventas30dVal,
      precioTN: precioTN.hasOwnProperty(variantes[k]) ? precioTN[variantes[k]] : null,
      precioMeli: precioMeliVal
    });
  }
  return result;
}

/**
 * Guarda los cambios de stock del FormularioV2.
 * - Graba en Registros (tipo "Actualizacion")
 * - Actualiza la hoja StockUbicacion
 *
 * datos = { empleado, sku, nombre, ubicacion, cambios: [{variante, stockNuevo}] }
 */
function guardarCambiosStockV2(datos) {
  // 1. Guardar en Registros
  var regSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');
  if (!regSheet) {
    regSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Registros');
    regSheet.appendRow([
      'Fecha', 'Empleado', 'SKU', 'Producto', 'Variante',
      'Tipo de Movimiento', 'Cantidad', 'Ubicación', 'Actualizado en TiendaNube', 'Comentarios'
    ]);
    regSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    regSheet.setFrozenRows(1);
  }

  var ahora = new Date();
  var filas = [];
  for (var i = 0; i < datos.cambios.length; i++) {
    var c = datos.cambios[i];
    filas.push([ahora, datos.empleado, datos.sku, datos.nombre, c.variante,
                'Actualizacion', c.stockNuevo, datos.ubicacion, '', '']);
  }
  var lastRow = regSheet.getLastRow();
  regSheet.getRange(lastRow + 1, 1, filas.length, 10).setValues(filas);
  regSheet.getRange(lastRow + 1, 1, filas.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

  // 2. Actualizar hoja StockUbicacion
  actualizarStockUbicacion_(datos.sku, datos.nombre, datos.ubicacion, datos.cambios);

  // 3. Sumar Local + Depósito y actualizar TiendaNube
  var actualizadosTN = 0;
  var erroresTN = [];
  try {
    var stockSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('StockUbicacion');
    if (stockSheet) {
      var stockData = stockSheet.getDataRange().getValues();

      for (var j = 0; j < datos.cambios.length; j++) {
        var variante = datos.cambios[j].variante;
        var stockLocal = 0;
        var stockDeposito = 0;

        // Buscar stock de ambas ubicaciones para esta variante
        for (var k = 1; k < stockData.length; k++) {
          if (stockData[k][0].toString().trim() === datos.sku &&
              stockData[k][2].toString().trim() === variante) {
            var ubic = stockData[k][3].toString().trim();
            var stock = parseInt(stockData[k][4]) || 0;
            if (ubic === 'Local') stockLocal = stock;
            else if (ubic === 'Deposito') stockDeposito = stock;
          }
        }

        var stockTotal = stockLocal + stockDeposito;
        var filaRegistro = lastRow + 1 + j;

        // Buscar producto en TiendaNube y actualizar (con reintento si hay rate limit)
        try {
          var producto = null;
          var intentosBusqueda = 0;
          while (intentosBusqueda < 3 && !producto) {
            try {
              producto = buscarProductoTiendaNube_(datos.sku, variante);
            } catch (eBusqueda) {
              intentosBusqueda++;
              if (intentosBusqueda < 3) Utilities.sleep(3000 * intentosBusqueda); // 3s, 6s
              else throw eBusqueda;
            }
          }
          if (producto) {
            var intentos = 0;
            var actualizado = false;
            while (intentos < 3 && !actualizado) {
              try {
                actualizarStockTiendaNube_(producto.product_id, producto.variant_id, stockTotal);
                actualizado = true;
              } catch (eRetry) {
                intentos++;
                if (intentos < 3) Utilities.sleep(2000 * intentos); // 2s, 4s
                else throw eRetry;
              }
            }
            actualizadosTN++;
            regSheet.getRange(filaRegistro, 9).setValue(
              Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss')
            );
          }
        } catch (eTN) {
          erroresTN.push(variante + ': ' + eTN.message);
          regSheet.getRange(filaRegistro, 9).setValue(
            Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss')
          );
          regSheet.getRange(filaRegistro, 10).setValue('Error TN: ' + eTN.message);
          regSheet.getRange(filaRegistro, 1, 1, 10).setBackground('#ffcdd2');
        }

        // Pausa entre variantes para evitar rate limit
        Utilities.sleep(1500);
      }
    }
  } catch (e) {
    erroresTN.push('Error general: ' + e.message);
  }

  var mensaje = datos.cambios.length + ' variante' + (datos.cambios.length !== 1 ? 's' : '') +
    ' actualizada' + (datos.cambios.length !== 1 ? 's' : '') + ' en ' + datos.ubicacion;
  if (actualizadosTN > 0) {
    mensaje += ' ✅ TiendaNube actualizado (' + actualizadosTN + ')';
  }
  if (erroresTN.length > 0) {
    mensaje += ' ⚠️ Errores TN: ' + erroresTN.join('; ');
  }

  return { success: true, message: mensaje };
}

/**
 * Actualiza la hoja StockUbicacion con los nuevos valores.
 * Si no existe la fila, la crea. Si existe, la actualiza.
 * Columnas: SKU | Producto | Variante | Ubicacion | Stock | Ultima Actualizacion
 */
function actualizarStockUbicacion_(sku, nombre, ubicacion, cambios) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('StockUbicacion');
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('StockUbicacion');
    sheet.appendRow(['SKU', 'Producto', 'Variante', 'Ubicacion', 'Stock', 'Ultima Actualizacion']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  var data = sheet.getDataRange().getValues();
  var ahora = new Date();

  for (var i = 0; i < cambios.length; i++) {
    var c = cambios[i];
    var found = false;

    for (var j = 1; j < data.length; j++) {
      if (data[j][0].toString().trim() === sku &&
          data[j][2].toString().trim() === c.variante &&
          data[j][3].toString().trim() === ubicacion) {
        // Actualizar fila existente
        sheet.getRange(j + 1, 5).setValue(c.stockNuevo);
        sheet.getRange(j + 1, 6).setValue(ahora);
        sheet.getRange(j + 1, 6).setNumberFormat('dd/MM/yyyy HH:mm:ss');
        data[j][4] = c.stockNuevo; // Actualizar array para búsquedas posteriores
        found = true;
        break;
      }
    }

    if (!found) {
      // Crear fila nueva
      sheet.appendRow([sku, nombre, c.variante, ubicacion, c.stockNuevo, ahora]);
      var newLastRow = sheet.getLastRow();
      sheet.getRange(newLastRow, 6).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      data.push([sku, nombre, c.variante, ubicacion, c.stockNuevo, ahora]);
    }
  }
}

/**
 * EJECUTAR UNA SOLA VEZ desde el editor (▶️).
 * Toma el stock actual de TiendaNube y lo carga en StockUbicacion como "Local".
 * Solo carga productos que NO tienen stock en StockUbicacion (no pisa datos existentes).
 * Después de ejecutar, TN se va a actualizar correctamente con Local + Deposito.
 */
function cargarStockInicialDesdeTN() {
  var token = getTiendaNubeToken_();
  if (!token) throw new Error('Token de TiendaNube no configurado.');

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Leer StockUbicacion existente para no pisar datos
  var stockSheet = ss.getSheetByName('StockUbicacion');
  if (!stockSheet) {
    stockSheet = ss.insertSheet('StockUbicacion');
    stockSheet.appendRow(['SKU', 'Producto', 'Variante', 'Ubicacion', 'Stock', 'Ultima Actualizacion']);
    stockSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    stockSheet.setFrozenRows(1);
  }

  var dataExistente = stockSheet.getDataRange().getValues();
  var existentes = {};
  for (var e = 1; e < dataExistente.length; e++) {
    var keyE = (dataExistente[e][0] || '').toString().trim() + '|||' +
              (dataExistente[e][2] || '').toString().trim() + '|||' +
              (dataExistente[e][3] || '').toString().trim();
    existentes[keyE] = true;
  }

  // 2. Leer hoja Productos para tener los nombres
  var prodSheet = ss.getSheetByName('Productos');
  var prodData = prodSheet ? prodSheet.getDataRange().getValues() : [];
  var nombresProd = {};
  for (var p = 1; p < prodData.length; p++) {
    var skuP = (prodData[p][0] || '').toString().trim();
    var nombreP = (prodData[p][1] || '').toString().trim();
    if (skuP && nombreP) nombresProd[skuP] = nombreP;
  }

  // 3. Traer todos los productos de TiendaNube CON stock
  var todosProductos = [];
  var page = 1;
  var perPage = 200;
  var hayMas = true;

  while (hayMas) {
    var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID +
      '/products?per_page=' + perPage + '&page=' + page;
    var response = UrlFetchApp.fetch(url, {
      headers: {
        'Authentication': 'bearer ' + token,
        'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) break;
    var products = JSON.parse(response.getContentText());
    if (products.length === 0) { hayMas = false; break; }

    for (var pp = 0; pp < products.length; pp++) {
      var product = products[pp];
      var nombreProd = product.name.es || product.name.pt || '';
      var variants = product.variants || [];
      for (var vv = 0; vv < variants.length; vv++) {
        var variant = variants[vv];
        var skuV = variant.sku || '';
        if (!skuV) continue;
        var variantValues = (variant.values || []).map(function(val) {
          return val.es || val.pt || '';
        });
        var variantName = variantValues.length > 0 ? variantValues.join(' / ') : '(Sin variante)';
        todosProductos.push({
          sku: skuV,
          nombre: nombreProd,
          variante: variantName,
          stock: variant.stock || 0
        });
      }
    }
    page++;
    Utilities.sleep(300);
  }

  var ahora = new Date();
  var filasNuevas = [];
  var omitidos = 0;

  for (var i = 0; i < todosProductos.length; i++) {
    var prod = todosProductos[i];
    var sku = prod.sku || '';
    var variante = prod.variante || '';
    if (!sku) continue;

    // Verificar que no exista ya en Local
    var keyLocal = sku + '|||' + variante + '|||Local';
    if (existentes[keyLocal]) {
      omitidos++;
      continue;
    }

    var stockTN = prod.stock || 0;
    var nombre = nombresProd[sku] || prod.nombre || '';

    filasNuevas.push([sku, nombre, variante, 'Local', stockTN, ahora]);
    existentes[keyLocal] = true;
  }

  // 4. Escribir filas nuevas
  if (filasNuevas.length > 0) {
    var lastRow = stockSheet.getLastRow();
    stockSheet.getRange(lastRow + 1, 1, filasNuevas.length, 6).setValues(filasNuevas);
    stockSheet.getRange(lastRow + 1, 6, filasNuevas.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }

  Logger.log('✅ Carga inicial completada: ' + filasNuevas.length + ' variantes cargadas en Local. ' + omitidos + ' omitidas (ya existían).');
  return { cargadas: filasNuevas.length, omitidas: omitidos };
}

/**
 * Guarda múltiples lotes de cambios del FormularioV2 (cola completa).
 * listaCambios: array de { empleado, sku, nombre, ubicacion, cambios: [{variante, stockNuevo}] }
 */
function guardarMultiplesCambiosV2(listaCambios) {
  var totalVariantes = 0;
  for (var i = 0; i < listaCambios.length; i++) {
    guardarCambiosStockV2(listaCambios[i]);
    totalVariantes += listaCambios[i].cambios.length;
    if (i < listaCambios.length - 1) Utilities.sleep(2000); // pausa entre productos distintos
  }
  return {
    success: true,
    message: totalVariantes + ' variante' + (totalVariantes !== 1 ? 's' : '') +
             ' en ' + listaCambios.length + ' producto' + (listaCambios.length !== 1 ? 's' : '') +
             ' registrada' + (totalVariantes !== 1 ? 's' : '') + ' correctamente'
  };
}

// ============================================================
// LIMPIEZA AUTOMATICA DE REGISTROS ANTIGUOS
// ============================================================

/**
 * Borra filas de la hoja Registros con más de 3 meses de antigüedad.
 * Se ejecuta automáticamente cada semana via trigger.
 */
function limpiarRegistrosAntiguos() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');
  if (!sheet) return;

  var limite = new Date();
  limite.setMonth(limite.getMonth() - 3);

  var data = sheet.getDataRange().getValues();
  var filasABorrar = [];

  for (var i = data.length - 1; i >= 1; i--) { // de abajo para arriba, saltando encabezado
    var fecha = new Date(data[i][0]);
    if (!isNaN(fecha) && fecha < limite) {
      filasABorrar.push(i + 1); // fila en Sheet (1-indexed)
    }
  }

  for (var j = 0; j < filasABorrar.length; j++) {
    sheet.deleteRow(filasABorrar[j] - j); // compensar desplazamiento
  }

  Logger.log('Limpieza completada: ' + filasABorrar.length + ' filas borradas (anteriores a ' + limite.toLocaleDateString() + ')');
  return filasABorrar.length;
}

/**
 * Crea el trigger semanal para limpiarRegistrosAntiguos.
 * Ejecutar UNA VEZ manualmente desde el editor de Apps Script.
 */
function crearTriggerLimpiezaSemanal() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'limpiarRegistrosAntiguos') {
      Logger.log('El trigger ya existe.');
      return;
    }
  }
  ScriptApp.newTrigger('limpiarRegistrosAntiguos')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(3)
    .create();
  Logger.log('Trigger semanal creado: limpiarRegistrosAntiguos los lunes a las 3am.');
}

// ============================================================
// MIGRACION: Cargar StockUbicacion desde Registros existentes
// ============================================================

/**
 * EJECUTAR UNA VEZ desde el editor de Apps Script.
 * Lee todos los registros existentes y calcula el stock actual
 * por SKU + Variante + Ubicacion.
 *
 * Lógica:
 * - Actualizacion: el stock QUEDA en esa cantidad
 * - Ingreso: suma al stock acumulado
 * - Vendido / Full: resta del stock acumulado
 *
 * Procesa los registros en orden cronológico (de arriba a abajo).
 */
function migrarStockDesdeRegistros() {
  var regSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');
  if (!regSheet) {
    Logger.log('No existe la hoja Registros. No hay nada que migrar.');
    return;
  }

  var data = regSheet.getDataRange().getValues();
  // stockMap: { "SKU|||Variante|||Ubicacion": { stock: N, nombre: "..." } }
  var stockMap = {};

  for (var i = 1; i < data.length; i++) {
    var sku = (data[i][2] || '').toString().trim();
    var nombre = (data[i][3] || '').toString().trim();
    var variante = (data[i][4] || '').toString().trim();
    var tipo = (data[i][5] || '').toString().trim();
    var cantidad = parseInt(data[i][6]) || 0;
    var ubicacion = (data[i][7] || '').toString().trim();

    if (!sku || !variante || !ubicacion) continue;

    var key = sku + '|||' + variante + '|||' + ubicacion;

    if (!stockMap[key]) {
      stockMap[key] = { stock: 0, nombre: nombre, sku: sku, variante: variante, ubicacion: ubicacion };
    }

    switch (tipo) {
      case 'Actualizacion':
        stockMap[key].stock = cantidad;
        break;
      case 'Ingreso':
        stockMap[key].stock += cantidad;
        break;
      case 'Vendido':
      case 'Full':
        stockMap[key].stock = Math.max(0, stockMap[key].stock - cantidad);
        break;
    }
  }

  // Crear o limpiar la hoja StockUbicacion
  var stockSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('StockUbicacion');
  if (stockSheet) {
    stockSheet.clear();
  } else {
    stockSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('StockUbicacion');
  }

  // Header
  stockSheet.appendRow(['SKU', 'Producto', 'Variante', 'Ubicacion', 'Stock', 'Ultima Actualizacion']);
  stockSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  stockSheet.setFrozenRows(1);

  // Escribir datos
  var keys = Object.keys(stockMap);
  if (keys.length > 0) {
    var filas = [];
    var ahora = new Date();
    for (var j = 0; j < keys.length; j++) {
      var entry = stockMap[keys[j]];
      filas.push([entry.sku, entry.nombre, entry.variante, entry.ubicacion, entry.stock, ahora]);
    }
    stockSheet.getRange(2, 1, filas.length, 6).setValues(filas);
    stockSheet.getRange(2, 6, filas.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }

  Logger.log('Migración completada: ' + keys.length + ' registros de stock por ubicación creados.');
}

// ============================================================
// CONFIGURACION MERCADOLIBRE
// ============================================================
var MELI_APP_ID = '3298648685145190';
var MELI_SECRET_KEY = 'Gg3PcA3KNsfIFBSYeXll6Ih917ZmKDM7';
var MELI_REDIRECT_URI = 'https://www.google.com';

/**
 * Obtiene el access token de MeLi. Si venció, lo renueva automáticamente.
 */
function getMeliToken_() {
  var props = PropertiesService.getScriptProperties();
  var accessToken = props.getProperty('MELI_ACCESS_TOKEN');
  var expiry = parseInt(props.getProperty('MELI_TOKEN_EXPIRY')) || 0;

  // Si el token existe y no venció (con 5 min de margen), usarlo
  if (accessToken && new Date().getTime() < expiry - 300000) {
    return accessToken;
  }

  // Intentar renovar con refresh token
  var refreshToken = props.getProperty('MELI_REFRESH_TOKEN');
  if (refreshToken) {
    return renovarMeliToken_(refreshToken);
  }

  throw new Error('Token de MeLi no configurado. Ejecutar autorizarMeli() primero.');
}

/**
 * Renueva el token de MeLi usando el refresh token.
 */
function renovarMeliToken_(refreshToken) {
  var response = UrlFetchApp.fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'post',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    payload: 'grant_type=refresh_token&client_id=' + MELI_APP_ID +
             '&client_secret=' + MELI_SECRET_KEY +
             '&refresh_token=' + refreshToken,
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Error renovando token MeLi: ' + response.getContentText());
  }

  var data = JSON.parse(response.getContentText());
  var props = PropertiesService.getScriptProperties();
  props.setProperty('MELI_ACCESS_TOKEN', data.access_token);
  props.setProperty('MELI_REFRESH_TOKEN', data.refresh_token);
  props.setProperty('MELI_TOKEN_EXPIRY', (new Date().getTime() + data.expires_in * 1000).toString());
  props.setProperty('MELI_USER_ID', data.user_id.toString());

  return data.access_token;
}

/**
 * EJECUTAR UNA VEZ: canjea el código de autorización por tokens.
 */
function autorizarMeli() {
  var code = 'TG-69e90361b28f900001fec664-161997019';

  var response = UrlFetchApp.fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'post',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    payload: 'grant_type=authorization_code&client_id=' + MELI_APP_ID +
             '&client_secret=' + MELI_SECRET_KEY +
             '&code=' + code +
             '&redirect_uri=' + encodeURIComponent(MELI_REDIRECT_URI),
    muteHttpExceptions: true
  });

  var responseCode = response.getResponseCode();
  var body = response.getContentText();

  if (responseCode !== 200) {
    Logger.log('Error ' + responseCode + ': ' + body);
    throw new Error('Error obteniendo token: ' + body);
  }

  var data = JSON.parse(body);
  var props = PropertiesService.getScriptProperties();
  props.setProperty('MELI_ACCESS_TOKEN', data.access_token);
  props.setProperty('MELI_REFRESH_TOKEN', data.refresh_token);
  props.setProperty('MELI_TOKEN_EXPIRY', (new Date().getTime() + data.expires_in * 1000).toString());
  props.setProperty('MELI_USER_ID', data.user_id.toString());

  Logger.log('MercadoLibre conectado! User ID: ' + data.user_id);
  Logger.log('Token expira en ' + data.expires_in + ' segundos');
  Logger.log('Ahora ejecutar crearTriggerRenovacionMeli() para renovación automática.');
}

/**
 * Crea un trigger que renueva el token de MeLi cada 5 horas automáticamente.
 * EJECUTAR UNA VEZ después de autorizarMeli().
 */
function crearTriggerRenovacionMeli() {
  // Borrar triggers existentes de esta función
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'renovarMeliTokenAuto_') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // Crear nuevo trigger cada 5 horas
  ScriptApp.newTrigger('renovarMeliTokenAuto_')
    .timeBased()
    .everyHours(5)
    .create();
  Logger.log('Trigger de renovación creado: cada 5 horas.');
}

/**
 * Función llamada por el trigger para renovar automáticamente.
 */
function renovarMeliTokenAuto_() {
  var refreshToken = PropertiesService.getScriptProperties().getProperty('MELI_REFRESH_TOKEN');
  if (refreshToken) {
    renovarMeliToken_(refreshToken);
    Logger.log('Token MeLi renovado automáticamente: ' + new Date());
  }
}

// ============================================================
// FUNCIONES DE CONSULTA MERCADOLIBRE
// ============================================================

/**
 * Helper: hace un GET a la API de MeLi con autenticación.
 */
function meliGet_(endpoint) {
  var token = getMeliToken_();
  var url = 'https://api.mercadolibre.com' + endpoint;
  var response = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Error MeLi API: ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

/**
 * Obtiene info del usuario (para verificar conexión).
 */
function getMeliUsuario() {
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');
  var data = meliGet_('/users/' + userId);
  return {
    id: data.id,
    nickname: data.nickname,
    reputacion: data.seller_reputation ? data.seller_reputation.level_id : 'N/A',
    ventas: data.seller_reputation ? data.seller_reputation.transactions.completed : 0,
    permalink: data.permalink
  };
}

/**
 * Obtiene las publicaciones activas del vendedor.
 * Devuelve un resumen con título, precio, stock, estado, etc.
 */
function getMeliPublicaciones(offset, limit) {
  offset = offset || 0;
  limit = limit || 20;
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');

  var search = meliGet_('/users/' + userId + '/items/search?offset=' + offset + '&limit=' + limit + '&status=active');
  var total = search.paging.total;
  var ids = search.results;

  if (ids.length === 0) return { publicaciones: [], total: total, offset: offset, limit: limit };

  // Traer detalle de hasta 20 items a la vez
  var items = meliGet_('/items?ids=' + ids.join(',') + '&attributes=id,title,price,original_price,available_quantity,sold_quantity,thumbnail,permalink,status,variations');

  var publicaciones = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i].body;
    if (!item) continue;

    var pub = {
      id: item.id,
      titulo: item.title,
      precio: item.original_price || item.price,
      stockDisponible: item.available_quantity,
      vendidos: item.sold_quantity,
      imagen: item.thumbnail,
      link: item.permalink,
      estado: item.status,
      variaciones: []
    };

    // Si tiene variaciones, traer detalle
    if (item.variations && item.variations.length > 0) {
      for (var v = 0; v < item.variations.length; v++) {
        var vari = item.variations[v];
        var attrs = (vari.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');
        pub.variaciones.push({
          id: vari.id,
          nombre: attrs,
          stock: vari.available_quantity,
          vendidos: vari.sold_quantity || 0
        });
      }
    }

    publicaciones.push(pub);
  }

  return { publicaciones: publicaciones, total: total, offset: offset, limit: limit };
}

/**
 * Busca publicaciones por texto (título o SKU de MeLi).
 */
function buscarMeliPublicaciones(query) {
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');

  var search = meliGet_('/users/' + userId + '/items/search?search_type=scan&q=' + encodeURIComponent(query) + '&limit=20');
  var ids = search.results;

  if (ids.length === 0) return { publicaciones: [], total: 0 };

  var items = meliGet_('/items?ids=' + ids.join(',') + '&attributes=id,title,price,original_price,available_quantity,sold_quantity,thumbnail,permalink,status,variations');

  var publicaciones = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i].body;
    if (!item) continue;

    var pub = {
      id: item.id,
      titulo: item.title,
      precio: item.original_price || item.price,
      stockDisponible: item.available_quantity,
      vendidos: item.sold_quantity,
      imagen: item.thumbnail,
      link: item.permalink,
      estado: item.status,
      variaciones: []
    };

    if (item.variations && item.variations.length > 0) {
      for (var v = 0; v < item.variations.length; v++) {
        var vari = item.variations[v];
        var attrs = (vari.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');
        pub.variaciones.push({
          id: vari.id,
          nombre: attrs,
          stock: vari.available_quantity,
          vendidos: vari.sold_quantity || 0
        });
      }
    }

    publicaciones.push(pub);
  }

  return { publicaciones: publicaciones, total: search.paging.total };
}

/**
 * Obtiene las últimas ventas (orders).
 */
function getMeliVentas(limit) {
  limit = limit || 20;
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');

  var data = meliGet_('/orders/search?seller=' + userId + '&sort=date_desc&limit=' + limit);

  var ventas = [];
  for (var i = 0; i < data.results.length; i++) {
    var order = data.results[i];
    var items = order.order_items.map(function(oi) {
      return {
        titulo: oi.item.title,
        cantidad: oi.quantity,
        precio: oi.unit_price,
        sku: oi.item.seller_sku || ''
      };
    });

    ventas.push({
      id: order.id,
      fecha: order.date_created,
      estado: order.status,
      total: order.total_amount,
      comprador: order.buyer.nickname,
      items: items
    });
  }

  return { ventas: ventas, total: data.paging.total };
}

/**
 * Verifica si MeLi está conectado.
 */
function verificarConexionMeli() {
  try {
    var token = getMeliToken_();
    var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
    if (!token || !userId) return { conectado: false };
    var user = meliGet_('/users/' + userId);
    return { conectado: true, nickname: user.nickname, userId: userId };
  } catch (e) {
    return { conectado: false, error: e.message };
  }
}

// ============================================================
// BUSQUEDA RAPIDA MELI (autocomplete)
// ============================================================

/**
 * Busca publicaciones en MeLi por texto (titulo, SKU, etc).
 * Devuelve resultados livianos para el autocomplete.
 */
function buscarMeliRapido(query) {
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');

  query = query.toString().trim();
  if (query.length < 2) return [];

  var ids = [];
  var idSet = {};

  // 1. Buscar por seller_sku (SKU del vendedor)
  try {
    var searchSku = meliGet_('/users/' + userId + '/items/search?seller_sku=' + encodeURIComponent(query) + '&limit=20');
    var skuIds = searchSku.results || [];
    for (var s = 0; s < skuIds.length; s++) {
      if (!idSet[skuIds[s]]) {
        ids.push(skuIds[s]);
        idSet[skuIds[s]] = true;
      }
    }
  } catch (e) { /* ignorar error de SKU search */ }

  // 2. Buscar por texto en titulo (complementa los resultados)
  try {
    var searchText = meliGet_('/users/' + userId + '/items/search?q=' + encodeURIComponent(query) + '&limit=20&status=active');
    var textIds = searchText.results || [];
    for (var t = 0; t < textIds.length; t++) {
      if (!idSet[textIds[t]]) {
        ids.push(textIds[t]);
        idSet[textIds[t]] = true;
      }
    }
  } catch (e) { /* ignorar error de text search */ }

  if (ids.length === 0) return [];

  // Limitar a 20 resultados
  ids = ids.slice(0, 20);

  // Traer info basica
  var items = meliGet_('/items?ids=' + ids.join(',') + '&attributes=id,title,price,original_price,available_quantity,thumbnail,shipping');

  var resultados = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i].body;
    if (!item) continue;

    var logistic = (item.shipping && item.shipping.logistic_type) || '';
    var esFull = (logistic === 'fulfillment');

    resultados.push({
      id: item.id,
      titulo: item.title,
      precio: item.original_price || item.price,
      stock: item.available_quantity,
      imagen: item.thumbnail,
      tipoEnvio: esFull ? 'Full' : 'Deposito'
    });
  }

  return resultados;
}

// ============================================================
// CONSULTA DE STOCK MELI POR SKU (Deposito vs Full)
// ============================================================

/**
 * Busca un SKU en MercadoLibre y devuelve el stock separado por tipo de envío:
 * - Depósito (self/xd/drop_off): stock que maneja el vendedor
 * - Full (fulfillment): stock en el centro de MercadoLibre
 */
function consultarStockMeliBySKU(skuBuscado) {
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');

  skuBuscado = skuBuscado.toString().trim();
  if (!skuBuscado) throw new Error('Ingresa un SKU para consultar.');

  // 1. Buscar items que tengan este SKU
  var search = meliGet_('/users/' + userId + '/items/search?seller_sku=' + encodeURIComponent(skuBuscado) + '&limit=50');
  var ids = search.results || [];

  if (ids.length === 0) {
    search = meliGet_('/users/' + userId + '/items/search?q=' + encodeURIComponent(skuBuscado) + '&limit=50');
    ids = search.results || [];
  }

  if (ids.length === 0) {
    return { encontrado: false, sku: skuBuscado, publicaciones: [] };
  }

  // 2. Traer detalle de los items (en lotes de 20)
  var publicaciones = [];

  for (var batch = 0; batch < ids.length; batch += 20) {
    var batchIds = ids.slice(batch, batch + 20);
    var items = meliGet_('/items?ids=' + batchIds.join(',') + '&attributes=id,title,price,original_price,available_quantity,sold_quantity,thumbnail,permalink,shipping,variations,seller_custom_field,inventory_id');

    for (var i = 0; i < items.length; i++) {
      var item = items[i].body;
      if (!item) continue;

      var logisticType = (item.shipping && item.shipping.logistic_type) ? item.shipping.logistic_type : 'unknown';

      var pub = {
        id: item.id,
        titulo: item.title,
        precio: item.original_price || item.price,
        stockTotal: item.available_quantity,
        vendidos: item.sold_quantity,
        imagen: item.thumbnail,
        link: item.permalink,
        logisticType: logisticType,
        stockDeposito: 0,
        stockFull: 0,
        variaciones: []
      };

      // 3. Consultar stock por almacén para esta publicación
      var stockPorAlmacen = obtenerStockPorAlmacen_(item.id);
      if (stockPorAlmacen) {
        pub.stockDeposito = stockPorAlmacen.deposito;
        pub.stockFull = stockPorAlmacen.full;
      } else {
        // Fallback: si no se puede consultar por almacén, usar logistic_type
        if (logisticType === 'fulfillment') {
          pub.stockFull = item.available_quantity;
        } else {
          pub.stockDeposito = item.available_quantity;
        }
      }

      // Procesar variaciones
      if (item.variations && item.variations.length > 0) {
        for (var v = 0; v < item.variations.length; v++) {
          var vari = item.variations[v];
          var attrs = (vari.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');
          var sellerSku = vari.seller_custom_field || '';

          var variData = {
            id: vari.id,
            nombre: attrs || '(Sin nombre)',
            stock: vari.available_quantity,
            vendidos: vari.sold_quantity || 0,
            sku: sellerSku,
            stockDeposito: 0,
            stockFull: 0
          };

          // Stock por almacén de la variación
          var varStock = obtenerStockVariacionPorAlmacen_(item.id, vari.id, vari.user_product_id);
          if (varStock) {
            variData.stockDeposito = varStock.deposito;
            variData.stockFull = varStock.full;
          } else if (logisticType === 'fulfillment') {
            variData.stockFull = vari.available_quantity;
          } else {
            variData.stockDeposito = vari.available_quantity;
          }

          pub.variaciones.push(variData);
        }
      }

      publicaciones.push(pub);
    }

    if (batch + 20 < ids.length) Utilities.sleep(300);
  }

  // 4. Calcular totales
  var totalDeposito = 0;
  var totalFull = 0;
  publicaciones.forEach(function(p) {
    totalDeposito += p.stockDeposito;
    totalFull += p.stockFull;
  });

  return {
    encontrado: true,
    sku: skuBuscado,
    stockDeposito: totalDeposito,
    stockFull: totalFull,
    stockTotal: totalDeposito + totalFull,
    totalPublicaciones: publicaciones.length,
    publicaciones: publicaciones
  };
}

/**
 * Obtiene el stock de un item desglosado por almacén (depósito vs full).
 * Usa el endpoint /items/{id}/stock/warehouses de MeLi.
 */
/**
 * Obtiene stock desglosado por ubicación via /user-products/{id}/stock.
 * Devuelve { deposito: X, full: Y } o null si falla.
 */
function obtenerStockViaUserProduct_(userProductId) {
  if (!userProductId) return null;
  try {
    var data = meliGet_('/user-products/' + userProductId + '/stock');
    if (!data || !data.locations) return null;

    var deposito = 0;
    var full = 0;
    for (var i = 0; i < data.locations.length; i++) {
      var loc = data.locations[i];
      var qty = loc.quantity || 0;
      if (loc.type === 'meli_facility') {
        full += qty;
      } else {
        deposito += qty;
      }
    }
    return { deposito: deposito, full: full };
  } catch (e) {
    return null;
  }
}

/**
 * Intenta obtener stock por almacén probando múltiples endpoints de MeLi.
 * Devuelve { deposito: X, full: Y } o null si ninguno funciona.
 */
function obtenerStockPorAlmacen_(itemId, userProductId) {
  // Intentar primero via user-products
  var upResult = obtenerStockViaUserProduct_(userProductId);
  if (upResult) return upResult;

  // Si no se pasó userProductId, intentar obtenerlo del item
  if (!userProductId) {
    try {
      var itemData = meliGet_('/items/' + itemId + '?attributes=variations');
      // Items sin variaciones a veces tienen una sola variación interna
      if (itemData.variations && itemData.variations.length > 0 && itemData.variations[0].user_product_id) {
        var upResult2 = obtenerStockViaUserProduct_(itemData.variations[0].user_product_id);
        if (upResult2) return upResult2;
      }
    } catch (e) {}
  }

  // Fallback: endpoints viejos
  var endpoints = [
    '/items/' + itemId + '/stock/warehouses',
    '/items/' + itemId + '/stock',
    '/items/' + itemId + '/stock/channel'
  ];

  for (var e = 0; e < endpoints.length; e++) {
    try {
      var data = meliGet_(endpoints[e]);
      var result = parsearStockAlmacenes_(data);
      if (result) return result;
    } catch (err) {
      // Endpoint no funciona, probar siguiente
    }
  }

  // Intentar via inventory_id
  try {
    var item = meliGet_('/items/' + itemId + '?attributes=inventory_id');
    if (item && item.inventory_id) {
      var invEndpoints = [
        '/inventories/' + item.inventory_id + '/stock/warehouses',
        '/inventories/' + item.inventory_id + '/stock'
      ];
      for (var ie = 0; ie < invEndpoints.length; ie++) {
        try {
          var invData = meliGet_(invEndpoints[ie]);
          var invResult = parsearStockAlmacenes_(invData);
          if (invResult) return invResult;
        } catch (err2) {}
      }
    }
  } catch (err3) {}

  return null;
}

/**
 * Obtiene el stock de una variación desglosado por almacén.
 * Si se pasa userProductId, usa /user-products/{id}/stock (más confiable).
 */
function obtenerStockVariacionPorAlmacen_(itemId, variationId, userProductId) {
  // Intentar primero via user-products (endpoint más confiable)
  var upResult = obtenerStockViaUserProduct_(userProductId);
  if (upResult) return upResult;

  // Si no tiene userProductId, intentar obtenerlo del item
  if (!userProductId) {
    try {
      var item = meliGet_('/items/' + itemId + '?attributes=variations');
      var variaciones = item.variations || [];
      for (var v = 0; v < variaciones.length; v++) {
        if (String(variaciones[v].id) === String(variationId) && variaciones[v].user_product_id) {
          var upResult2 = obtenerStockViaUserProduct_(variaciones[v].user_product_id);
          if (upResult2) return upResult2;
        }
      }
    } catch (e) {}
  }

  // Fallback: endpoints viejos
  var endpoints = [
    '/items/' + itemId + '/variations/' + variationId + '/stock/warehouses',
    '/items/' + itemId + '/variations/' + variationId + '/stock',
    '/items/' + itemId + '/variations/' + variationId + '/stock/channel'
  ];

  for (var e = 0; e < endpoints.length; e++) {
    try {
      var data = meliGet_(endpoints[e]);
      var result = parsearStockAlmacenes_(data);
      if (result) return result;
    } catch (err) {}
  }

  return null;
}

/**
 * Parsea la respuesta de cualquier endpoint de stock por almacén.
 * Soporta múltiples formatos de respuesta de MeLi.
 */
function parsearStockAlmacenes_(data) {
  if (!data) return null;

  var deposito = 0;
  var full = 0;
  var encontrado = false;

  // Formato 1: Array de warehouses [{warehouse_id, available_quantity, type}]
  if (Array.isArray(data) && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var wh = data[i];
      var qty = wh.available_quantity || wh.stock || wh.quantity || 0;
      var whId = (wh.warehouse_id || wh.id || '').toString().toUpperCase();
      var whType = (wh.type || wh.channel || '').toString().toLowerCase();

      if (whId.indexOf('MELI') === 0 || whId.indexOf('FULL') !== -1 ||
          whType === 'fulfillment' || whType === 'meli_fulfillment' ||
          whType === 'full') {
        full += qty;
      } else {
        deposito += qty;
      }
      encontrado = true;
    }
  }

  // Formato 2: Objeto con channels [{id, stock}]
  if (!encontrado && data.channels && Array.isArray(data.channels)) {
    for (var c = 0; c < data.channels.length; c++) {
      var ch = data.channels[c];
      var chQty = ch.stock || ch.available_quantity || ch.quantity || 0;
      var chId = (ch.id || ch.channel || '').toString().toLowerCase();

      if (chId.indexOf('fulfillment') !== -1 || chId.indexOf('full') !== -1 ||
          chId.indexOf('meli') !== -1) {
        full += chQty;
      } else {
        deposito += chQty;
      }
      encontrado = true;
    }
  }

  // Formato 3: Objeto con locations [{location_id, available_quantity}]
  if (!encontrado && data.locations && Array.isArray(data.locations)) {
    for (var l = 0; l < data.locations.length; l++) {
      var loc = data.locations[l];
      var locQty = loc.available_quantity || loc.stock || loc.quantity || 0;
      var locId = (loc.location_id || loc.id || loc.type || '').toString().toLowerCase();

      if (locId.indexOf('fulfillment') !== -1 || locId.indexOf('full') !== -1 ||
          locId.indexOf('meli') !== -1) {
        full += locQty;
      } else {
        deposito += locQty;
      }
      encontrado = true;
    }
  }

  // Formato 4: Objeto directo {fulfillment: X, default: Y} o similar
  if (!encontrado && typeof data === 'object' && !Array.isArray(data)) {
    var keys = Object.keys(data);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k].toLowerCase();
      var val = data[keys[k]];
      if (typeof val === 'number') {
        if (key.indexOf('fulfillment') !== -1 || key.indexOf('full') !== -1 || key.indexOf('meli') !== -1) {
          full += val;
          encontrado = true;
        } else if (key.indexOf('default') !== -1 || key.indexOf('deposito') !== -1 || key.indexOf('seller') !== -1) {
          deposito += val;
          encontrado = true;
        }
      }
    }
  }

  return encontrado ? { deposito: deposito, full: full } : null;
}

/**
 * Función de debug: ejecutar desde el editor para ver qué endpoints de stock funcionan.
 * Usa un item ID real de tu cuenta.
 */
/**
 * EJECUTAR DESDE EL EDITOR para ver qué stock devuelve MeLi para SIM171J.
 * Ver resultado en Ver → Registros.
 */
function debugStockSIM171J() {
  var itemId = 'MLA1539640264';
  var token = getMeliToken_();

  // Obtener variaciones del item CON inventory_id
  var item = meliGet_('/items/' + itemId);
  var logType = item.shipping ? item.shipping.logistic_type : 'unknown';
  Logger.log('Item: ' + itemId + ' | logistic_type: ' + logType + ' | available_quantity: ' + item.available_quantity);

  var variaciones = item.variations || [];
  for (var v = 0; v < variaciones.length; v++) {
    var vari = variaciones[v];
    var attrs = (vari.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');
    var invId = vari.inventory_id || '';
    Logger.log('--- Variación: ' + attrs + ' (ID: ' + vari.id + ', inv: ' + invId + ') | available_qty: ' + vari.available_quantity);

    // Probar endpoint de inventario
    if (invId) {
      var endpoints = [
        '/inventories/' + invId + '/stock/warehouses',
        '/inventories/' + invId + '/stock',
        '/inventories/' + invId
      ];
      for (var e = 0; e < endpoints.length; e++) {
        try {
          var url = 'https://api.mercadolibre.com' + endpoints[e];
          var resp = UrlFetchApp.fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          });
          Logger.log('    ' + endpoints[e] + ' → ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 500));
        } catch (err) {
          Logger.log('    ' + endpoints[e] + ' → ERROR: ' + err.message);
        }
        Utilities.sleep(200);
      }
    }

    Utilities.sleep(300);
  }
}

/**
 * EJECUTAR DESDE EL EDITOR: prueba user_product_id en item SIN variaciones visibles.
 * Ver resultado en Ver → Registros.
 */
function debugItemSinVariaciones() {
  var itemId = 'MLA828829768';
  var token = getMeliToken_();

  // Traer item completo para ver toda la estructura
  var item = meliGet_('/items/' + itemId);
  Logger.log('Item: ' + item.title);
  Logger.log('Status: ' + item.status);
  Logger.log('available_quantity: ' + item.available_quantity);
  Logger.log('logistic_type: ' + (item.shipping ? item.shipping.logistic_type : 'N/A'));
  Logger.log('seller_custom_field (item): ' + (item.seller_custom_field || 'NO TIENE'));
  Logger.log('Variaciones: ' + (item.variations ? item.variations.length : 0));

  if (item.variations && item.variations.length > 0) {
    for (var v = 0; v < item.variations.length; v++) {
      var vari = item.variations[v];
      var attrs = (vari.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');
      Logger.log('');
      Logger.log('  Variación ' + v + ': ' + (attrs || '(sin atributos)') + ' | ID: ' + vari.id);
      Logger.log('  user_product_id: ' + (vari.user_product_id || 'NO TIENE'));
      Logger.log('  available_quantity: ' + vari.available_quantity);
      Logger.log('  seller_custom_field: ' + (vari.seller_custom_field || 'NO TIENE'));

      if (vari.user_product_id) {
        try {
          var url = 'https://api.mercadolibre.com/user-products/' + vari.user_product_id + '/stock';
          var resp = UrlFetchApp.fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          });
          Logger.log('  /user-products/' + vari.user_product_id + '/stock → ' + resp.getResponseCode());
          Logger.log('  Respuesta: ' + resp.getContentText().substring(0, 1000));
        } catch (err) {
          Logger.log('  ERROR: ' + err.message);
        }
      }
    }
  } else {
    Logger.log('No tiene variaciones en el item');
  }

  // Buscar user_product_id a nivel item
  Logger.log('');
  Logger.log('=== Campos a nivel item ===');
  Logger.log('user_product_id (item): ' + (item.user_product_id || 'NO TIENE'));
  Logger.log('inventory_id: ' + (item.inventory_id || 'NO TIENE'));

  // Probar endpoint directo con item id como user-product
  var candidatos = [item.user_product_id, item.inventory_id].filter(function(x) { return !!x; });

  // También probar /user-products/search
  try {
    var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
    var searchUrl = 'https://api.mercadolibre.com/user-products/search?seller_id=' + userId + '&item_id=' + itemId;
    var searchResp = UrlFetchApp.fetch(searchUrl, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
    Logger.log('');
    Logger.log('/user-products/search?item_id=' + itemId + ' → ' + searchResp.getResponseCode());
    Logger.log('Respuesta: ' + searchResp.getContentText().substring(0, 1500));
  } catch (err) {
    Logger.log('Error en search: ' + err.message);
  }

  // Probar con cada candidato
  for (var c = 0; c < candidatos.length; c++) {
    try {
      var url2 = 'https://api.mercadolibre.com/user-products/' + candidatos[c] + '/stock';
      var resp2 = UrlFetchApp.fetch(url2, {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });
      Logger.log('');
      Logger.log('/user-products/' + candidatos[c] + '/stock → ' + resp2.getResponseCode());
      Logger.log('Respuesta: ' + resp2.getContentText().substring(0, 1000));
    } catch (err2) {
      Logger.log('ERROR con ' + candidatos[c] + ': ' + err2.message);
    }
  }
}

/**
 * EJECUTAR DESDE EL EDITOR: investiga por qué un MLA no trae stock Full.
 * Muestra logistic_type y stock por location de cada variación.
 */
function debugBlancoNoFull() {
  var mlas = ['MLA900453175', 'MLA2306234478'];
  var token = getMeliToken_();

  for (var m = 0; m < mlas.length; m++) {
    var itemId = mlas[m];
    Logger.log('');
    Logger.log('============================================');
    Logger.log('ITEM: ' + itemId);
    Logger.log('============================================');

    try {
      var item = meliGet_('/items/' + itemId);
      Logger.log('Título: ' + item.title);
      Logger.log('Status: ' + item.status);
      Logger.log('logistic_type: ' + (item.shipping ? item.shipping.logistic_type : 'N/A'));
      Logger.log('available_quantity: ' + item.available_quantity);
      Logger.log('seller_custom_field (item): ' + (item.seller_custom_field || '-'));
      Logger.log('user_product_id (item): ' + (item.user_product_id || '-'));
      Logger.log('catalog_product_id: ' + (item.catalog_product_id || '-'));
      Logger.log('catalog_listing: ' + item.catalog_listing);

      if (item.variations && item.variations.length > 0) {
        for (var v = 0; v < item.variations.length; v++) {
          var vari = item.variations[v];
          var attrs = (vari.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');
          Logger.log('');
          Logger.log('  --- Variación: ' + attrs + ' ---');
          Logger.log('  variation_id: ' + vari.id);
          Logger.log('  user_product_id: ' + (vari.user_product_id || '-'));
          Logger.log('  seller_custom_field: ' + (vari.seller_custom_field || '-'));
          Logger.log('  available_quantity: ' + vari.available_quantity);

          if (vari.user_product_id) {
            try {
              var url = 'https://api.mercadolibre.com/user-products/' + vari.user_product_id + '/stock';
              var resp = UrlFetchApp.fetch(url, {
                headers: { 'Authorization': 'Bearer ' + token },
                muteHttpExceptions: true
              });
              Logger.log('  Stock → ' + resp.getContentText().substring(0, 500));
            } catch (err) {
              Logger.log('  ERROR stock: ' + err.message);
            }
          }
        }
      } else if (item.user_product_id) {
        try {
          var url2 = 'https://api.mercadolibre.com/user-products/' + item.user_product_id + '/stock';
          var resp2 = UrlFetchApp.fetch(url2, {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          });
          Logger.log('Stock (item sin variaciones) → ' + resp2.getContentText().substring(0, 500));
        } catch (err2) {
          Logger.log('ERROR stock: ' + err2.message);
        }
      }
    } catch (eItem) {
      Logger.log('ERROR al traer item: ' + eItem.message);
    }
  }
}

/**
 * EJECUTAR DESDE EL EDITOR: verifica cadena completa
 * MLA → StockFull → Vinculaciones → mapa final para un MLA específico.
 */
function debugCadenaFull() {
  var mlaABuscar = 'MLA900453175';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Ver qué filas hay en StockFull para ese MLA
  Logger.log('=== HOJA StockFull ===');
  var sheetFull = ss.getSheetByName('StockFull');
  var dataFull = sheetFull.getDataRange().getValues();
  var encontradasFull = 0;
  for (var i = 1; i < dataFull.length; i++) {
    if ((dataFull[i][3] || '').toString().trim() === mlaABuscar) {
      Logger.log('  Fila ' + (i+1) + ': SKU=' + dataFull[i][0] +
        ' | Variante=' + dataFull[i][1] +
        ' | Stock=' + dataFull[i][2] +
        ' | MLA=' + dataFull[i][3] +
        ' | VarId=' + dataFull[i][4]);
      encontradasFull++;
    }
  }
  Logger.log('Total filas StockFull para ' + mlaABuscar + ': ' + encontradasFull);

  // 2. Ver qué filas hay en Vinculaciones para ese MLA
  Logger.log('');
  Logger.log('=== HOJA Vinculaciones ===');
  var sheetVinc = ss.getSheetByName('Vinculaciones');
  var dataVinc = sheetVinc.getDataRange().getValues();
  var encontradasVinc = 0;
  for (var j = 1; j < dataVinc.length; j++) {
    var mlaV = (dataVinc[j][0] || '').toString().trim();
    if (mlaV === mlaABuscar || mlaV === 'MLA2306234478') {
      Logger.log('  Fila ' + (j+1) + ':');
      Logger.log('    MLA=' + dataVinc[j][0]);
      Logger.log('    Publicacion=' + dataVinc[j][1]);
      Logger.log('    SKU MeLi=' + dataVinc[j][2]);
      Logger.log('    Variante MeLi=' + dataVinc[j][3]);
      Logger.log('    Stock=' + dataVinc[j][4]);
      Logger.log('    Precio=' + dataVinc[j][5]);
      Logger.log('    Tipo=' + dataVinc[j][6]);
      Logger.log('    SKU — Variante TN=' + dataVinc[j][7]);
      Logger.log('    Variacion ID=' + dataVinc[j][8]);
      encontradasVinc++;
    }
  }
  Logger.log('Total filas Vinculaciones para ese MLA (o el de catálogo): ' + encontradasVinc);

  // 3. Probar el mapa final
  Logger.log('');
  Logger.log('=== MAPA Full (resultado de leerMapaStockFull_) ===');
  var mapa = leerMapaStockFull_();
  var claves = Object.keys(mapa);
  Logger.log('Total claves en mapa: ' + claves.length);
  // Buscar claves relacionadas con las vinculaciones del MLA
  for (var k = 0; k < claves.length; k++) {
    if (claves[k].indexOf('BLANCO') !== -1 || claves[k].indexOf('IC3503') !== -1) {
      Logger.log('  ' + claves[k] + ' → ' + mapa[claves[k]]);
    }
  }
}

/**
 * EJECUTAR DESDE EL EDITOR: descubre el endpoint correcto para inbounds/envíos Full.
 * Ver resultado en Ver → Registros.
 */
function debugInboundEndpoints() {
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  var token = getMeliToken_();
  var inboundId = '65142375'; // envío de prueba

  Logger.log('USER ID: ' + userId);
  Logger.log('');

  // Usar inventory_id real de una variante Full (SIM171J - Negro: MLAU402156162 user_product, necesito inventory_id)
  // Primero traer un item Full y sacar su inventory_id
  var inventoryId = null;
  try {
    var item = meliGet_('/items/MLA1539640264?attributes=variations');
    if (item.variations && item.variations.length > 0) {
      for (var v = 0; v < item.variations.length; v++) {
        if (item.variations[v].inventory_id) {
          inventoryId = item.variations[v].inventory_id;
          Logger.log('inventory_id encontrado: ' + inventoryId + ' (variación: ' + item.variations[v].id + ')');
          break;
        }
      }
    }
  } catch(e) {
    Logger.log('Error buscando inventory_id: ' + e.message);
  }

  var today = new Date();
  var dateFrom = Utilities.formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), 'America/Argentina/Buenos_Aires', 'yyyyMMdd');
  var dateTo = Utilities.formatDate(today, 'America/Argentina/Buenos_Aires', 'yyyyMMdd');

  var endpoints = [
    // Operaciones de fulfillment por seller (todos los tipos)
    '/marketplace/stock/fulfillment/operations/search?seller_id=' + userId + '&date_from=' + dateFrom,
    '/marketplace/stock/fulfillment/operations/search?seller_id=' + userId + '&date_from=' + dateFrom + '&type=inbound_reception',
    '/marketplace/stock/fulfillment/operations/search?seller_id=' + userId + '&date_from=' + dateFrom + '&type=INBOUND_RECEPTION',
    '/marketplace/stock/fulfillment/operations/search?seller_id=' + userId,
  ];

  // Si tenemos inventory_id, agregar endpoints con él
  if (inventoryId) {
    endpoints.push('/marketplace/stock/fulfillment/operations/search?seller_id=' + userId + '&inventory_id=' + inventoryId + '&date_from=' + dateFrom);
    endpoints.push('/marketplace/stock/fulfillment/operations/search?seller_id=' + userId + '&inventory_id=' + inventoryId);
    endpoints.push('/inventories/' + inventoryId + '/stock/fulfillment/operations');
    endpoints.push('/inventories/' + inventoryId + '/inbounds');
    endpoints.push('/fulfillment/inventory/' + inventoryId + '/inbounds');
  }

  for (var i = 0; i < endpoints.length; i++) {
    var url = 'https://api.mercadolibre.com' + endpoints[i];
    try {
      var resp = UrlFetchApp.fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });
      var code = resp.getResponseCode();
      var body = resp.getContentText().substring(0, 300);
      Logger.log('[' + code + '] ' + endpoints[i]);
      if (code === 200) {
        Logger.log('    ✅ RESPUESTA: ' + body);
      }
    } catch (e) {
      Logger.log('[ERR] ' + endpoints[i] + ' → ' + e.message);
    }
    Utilities.sleep(200);
  }
  Logger.log('');
  Logger.log('=== FIN ===');
}

function debugStockEndpoints() {
  var itemId = 'MLA1357137514';
  var token = getMeliToken_();
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  var inventoryId = 'AVCV88019'; // inventory_id de la primera variacion

  Logger.log('========== PROBANDO ENDPOINTS CON INVENTORY_ID ==========');

  var endpoints = [
    '/inventories/' + inventoryId + '/stock/warehouses',
    '/inventories/' + inventoryId + '/stock',
    '/inventories/' + inventoryId,
    '/users/' + userId + '/inventories/' + inventoryId + '/stock/warehouses',
    '/users/' + userId + '/inventories/' + inventoryId,
    '/users/' + userId + '/shipping/fulfillment/stock?inventory_id=' + inventoryId,
    '/fulfillment/stock/' + inventoryId
  ];

  for (var i = 0; i < endpoints.length; i++) {
    var url = 'https://api.mercadolibre.com' + endpoints[i];
    try {
      var response = UrlFetchApp.fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });
      Logger.log('--- ' + endpoints[i] + ' ---');
      Logger.log('Status: ' + response.getResponseCode());
      Logger.log('Body: ' + response.getContentText().substring(0, 1000));
    } catch (e) {
      Logger.log('--- ' + endpoints[i] + ' --- ERROR: ' + e.message);
    }
    Utilities.sleep(200);
  }

  Logger.log('========== PROBANDO ENDPOINTS DE FULFILLMENT ==========');

  var endpoints2 = [
    '/users/' + userId + '/shipping/fulfillment/stock/items/' + itemId,
    '/users/' + userId + '/fulfillment/stock?item_id=' + itemId,
    '/shipments/items/' + itemId + '/warehouses',
    '/users/' + userId + '/items/stock?item_id=' + itemId
  ];

  for (var j = 0; j < endpoints2.length; j++) {
    var url2 = 'https://api.mercadolibre.com' + endpoints2[j];
    try {
      var resp2 = UrlFetchApp.fetch(url2, {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });
      Logger.log('--- ' + endpoints2[j] + ' ---');
      Logger.log('Status: ' + resp2.getResponseCode());
      Logger.log('Body: ' + resp2.getContentText().substring(0, 1000));
    } catch (e) {
      Logger.log('--- ' + endpoints2[j] + ' --- ERROR: ' + e.message);
    }
    Utilities.sleep(200);
  }

  Logger.log('========== FIN ==========');
}

/**
 * EJECUTAR DESDE EL EDITOR: prueba el endpoint /user-products/{id}/stock
 * con un item Full (SIM171J). Ver resultado en Ver → Registros.
 */
// ============================================================
// VENTAS ULTIMOS 30 DIAS (TiendaNube + MercadoLibre)
// ============================================================

/**
 * Trae órdenes pagadas de TiendaNube de los últimos 30 días.
 * Devuelve mapa: { "SKU|||VARIANTE": cantidad }
 */
function obtenerVentasTiendaNube30d_() {
  var token = getTiendaNubeToken_();
  if (!token) throw new Error('Token TiendaNube no configurado.');

  var fechaDesde = new Date();
  fechaDesde.setDate(fechaDesde.getDate() - 30);
  var fechaDesdeStr = fechaDesde.toISOString();

  var mapa = {};
  var page = 1;
  var hayMas = true;

  while (hayMas) {
    var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID +
      '/orders?per_page=200&page=' + page +
      '&payment_status=paid' +
      '&created_at_min=' + encodeURIComponent(fechaDesdeStr);

    var resp = UrlFetchApp.fetch(url, {
      headers: {
        'Authentication': 'bearer ' + token,
        'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });

    var code = resp.getResponseCode();
    if (code === 404) break;
    if (code !== 200) {
      Logger.log('Error TN órdenes (pág ' + page + '): ' + resp.getContentText());
      break;
    }

    var ordenes = JSON.parse(resp.getContentText());
    if (!ordenes || ordenes.length === 0) { hayMas = false; break; }

    for (var o = 0; o < ordenes.length; o++) {
      var orden = ordenes[o];
      var items = orden.products || [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var sku = (it.sku || '').toString().trim().toUpperCase();
        if (!sku) continue;

        // Variante: viene en it.variant_values como array de strings
        var variantValues = it.variant_values || [];
        var variante = variantValues.length > 0 ? variantValues.join(' / ').toUpperCase() : '(SIN VARIANTE)';

        var key = sku + '|||' + variante;
        mapa[key] = (mapa[key] || 0) + (it.quantity || 0);
      }
    }

    if (ordenes.length < 200) { hayMas = false; } else { page++; }
    Utilities.sleep(200);
  }

  return mapa;
}

/**
 * Trae órdenes pagadas de MercadoLibre de los últimos 30 días.
 * Usa hoja Vinculaciones para traducir MLA+variacionId → SKU+Variante TN.
 * Devuelve mapa: { "SKU|||VARIANTE": cantidad }
 */
function obtenerVentasMeli30d_() {
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');

  // Leer hoja Vinculaciones para armar mapa MLA+VarId → SKU|||Variante TN
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetVinc = ss.getSheetByName('Vinculaciones');
  var mapaVinc = {}; // key: "MLA_ID|||variacion_id" → "SKU|||VARIANTE"
  if (sheetVinc) {
    var dataVinc = sheetVinc.getDataRange().getValues();
    for (var r = 1; r < dataVinc.length; r++) {
      var mlaId = (dataVinc[r][0] || '').toString().trim();
      var vinculacion = (dataVinc[r][7] || '').toString().trim(); // SKU — Variante TN
      var varId = (dataVinc[r][8] || '').toString().trim();
      if (!mlaId || !vinculacion) continue;

      var partes = vinculacion.split(' — ');
      var skuTN = (partes[0] || '').trim().toUpperCase();
      var varTN = partes.length > 1 ? partes.slice(1).join(' — ').trim().toUpperCase() : '(SIN VARIANTE)';
      var keyVinc = mlaId + '|||' + varId;
      mapaVinc[keyVinc] = skuTN + '|||' + varTN;
    }
  }

  // Traer órdenes de MeLi de los últimos 30 días
  var fechaDesde = new Date();
  fechaDesde.setDate(fechaDesde.getDate() - 30);
  var fechaDesdeStr = Utilities.formatDate(fechaDesde, 'America/Argentina/Buenos_Aires', "yyyy-MM-dd'T'HH:mm:ss.000'Z'");

  var mapa = {};
  var offset = 0;
  var limit = 50;
  var hayMas = true;

  while (hayMas) {
    var url = 'https://api.mercadolibre.com/orders/search?seller=' + userId +
      '&order.status=paid' +
      '&order.date_created.from=' + encodeURIComponent(fechaDesdeStr) +
      '&sort=date_desc&limit=' + limit + '&offset=' + offset;

    var resp = meliGet_(url.replace('https://api.mercadolibre.com', ''));
    var results = resp.results || [];
    var total = resp.paging ? resp.paging.total : 0;

    for (var o = 0; o < results.length; o++) {
      var orden = results[o];
      var orderItems = orden.order_items || [];
      for (var i = 0; i < orderItems.length; i++) {
        var it = orderItems[i];
        var mlaId2 = it.item ? it.item.id : '';
        var varId2 = it.item ? (it.item.variation_id || '') : '';
        var keyVinc2 = mlaId2 + '|||' + varId2.toString();
        // También probar sin variación
        var keyVincSinVar = mlaId2 + '|||';

        var keyTN = mapaVinc[keyVinc2] || mapaVinc[keyVincSinVar] || null;
        if (!keyTN) continue; // No vinculado, ignorar

        mapa[keyTN] = (mapa[keyTN] || 0) + (it.quantity || 0);
      }
    }

    offset += limit;
    if (offset >= total || results.length === 0) { hayMas = false; }
    Utilities.sleep(300);
  }

  return mapa;
}

/**
 * Sincroniza ventas de los últimos 30 días (TN + MeLi) en la hoja "Ventas30d".
 * Columnas: SKU | Variante | Ventas TN | Ventas ML | Total | Última actualización
 */
function sincronizarVentas30d_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ventas30d');
  if (!sheet) {
    sheet = ss.insertSheet('Ventas30d');
  } else {
    sheet.clear();
  }

  sheet.appendRow(['SKU', 'Variante', 'Ventas TN', 'Ventas ML', 'Total 30d', 'Ultima actualizacion']);
  sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#e8f5e9');
  sheet.setFrozenRows(1);

  // Traer ventas de ambas plataformas
  var ventasTN = {};
  var ventasML = {};

  try {
    ventasTN = obtenerVentasTiendaNube30d_();
    Logger.log('Ventas TN obtenidas: ' + Object.keys(ventasTN).length + ' combinaciones');
  } catch (e) {
    Logger.log('Error ventas TN: ' + e.message);
  }

  try {
    ventasML = obtenerVentasMeli30d_();
    Logger.log('Ventas ML obtenidas: ' + Object.keys(ventasML).length + ' combinaciones');
  } catch (e) {
    Logger.log('Error ventas ML: ' + e.message);
  }

  // Combinar todas las claves
  var todasClaves = {};
  Object.keys(ventasTN).forEach(function(k) { todasClaves[k] = true; });
  Object.keys(ventasML).forEach(function(k) { todasClaves[k] = true; });

  var filas = [];
  var ahora = new Date();
  var claves = Object.keys(todasClaves);

  claves.sort(); // Ordenar por SKU
  for (var i = 0; i < claves.length; i++) {
    var partes = claves[i].split('|||');
    var sku = partes[0];
    var variante = partes[1] || '';
    var vTN = ventasTN[claves[i]] || 0;
    var vML = ventasML[claves[i]] || 0;
    filas.push([sku, variante, vTN, vML, vTN + vML, ahora]);
  }

  if (filas.length > 0) {
    sheet.getRange(2, 1, filas.length, 6).setValues(filas);
    sheet.getRange(2, 6, filas.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }

  Logger.log('Ventas30d sincronizadas: ' + filas.length + ' combinaciones SKU+variante');
  return { total: filas.length };
}

/**
 * EJECUTAR UNA VEZ: crea el trigger diario para sincronizar ventas a las 5am.
 */
function crearTriggerVentas30d() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sincronizarVentas30dAuto_') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('sincronizarVentas30dAuto_')
    .timeBased()
    .atHour(5)
    .everyDays(1)
    .inTimezone('America/Argentina/Buenos_Aires')
    .create();
  Logger.log('Trigger diario de ventas creado — se ejecuta a las 5am Argentina.');
}

function sincronizarVentas30dAuto_() {
  try {
    var r = sincronizarVentas30d_();
    Logger.log('Ventas30d auto: ' + r.total + ' registros');
  } catch (e) {
    Logger.log('Error sincronizarVentas30dAuto_: ' + e.message);
  }
}

/**
 * EJECUTAR DESDE EL EDITOR para probar manualmente.
 */
function sincronizarVentas30d() {
  var r = sincronizarVentas30d_();
  Logger.log('✅ Listo: ' + r.total + ' combinaciones SKU+variante guardadas en Ventas30d');
}

/**
 * Devuelve mapa de ventas 30d indexado por "SKU|||VARIANTE" (en mayúsculas).
 * Usado por getVariantesConStock para mostrar la columna en Consultar Stock.
 */
function leerMapaVentas30d_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ventas30d');
  if (!sheet) return {};

  var data = sheet.getDataRange().getValues();
  var mapa = {};
  for (var i = 1; i < data.length; i++) {
    var sku = (data[i][0] || '').toString().trim().toUpperCase();
    var variante = (data[i][1] || '').toString().trim().toUpperCase();
    var total = parseInt(data[i][4]) || 0;
    if (!sku) continue;
    mapa[sku + '|||' + variante] = total;
  }
  return mapa;
}

function debugUserProductStock() {
  var itemId = 'MLA1539640264'; // SIM171J
  var token = getMeliToken_();

  // 1. Obtener el item con sus variaciones
  var item = meliGet_('/items/' + itemId + '?attributes=id,title,variations');
  Logger.log('Item: ' + item.title);
  Logger.log('Variaciones: ' + item.variations.length);

  var variaciones = item.variations || [];
  for (var v = 0; v < variaciones.length; v++) {
    var vari = variaciones[v];
    var attrs = (vari.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');
    var userProductId = vari.user_product_id || null;

    Logger.log('');
    Logger.log('=== Variación: ' + attrs + ' (ID: ' + vari.id + ') ===');
    Logger.log('    user_product_id: ' + userProductId);
    Logger.log('    available_quantity: ' + vari.available_quantity);

    // 2. Probar el endpoint /user-products/{id}/stock
    if (userProductId) {
      try {
        var url = 'https://api.mercadolibre.com/user-products/' + userProductId + '/stock';
        var resp = UrlFetchApp.fetch(url, {
          headers: { 'Authorization': 'Bearer ' + token },
          muteHttpExceptions: true
        });
        Logger.log('    /user-products/' + userProductId + '/stock → ' + resp.getResponseCode());
        Logger.log('    Respuesta: ' + resp.getContentText().substring(0, 1000));
      } catch (err) {
        Logger.log('    ERROR: ' + err.message);
      }
    } else {
      Logger.log('    ⚠️ No tiene user_product_id — probando desde item completo...');
      // Traer el item sin filtrar attributes para ver si viene user_product_id
      try {
        var fullItem = meliGet_('/items/' + itemId);
        var fullVari = fullItem.variations[v];
        Logger.log('    user_product_id (sin filtro): ' + (fullVari.user_product_id || 'NO EXISTE'));
        if (fullVari.user_product_id) {
          var url2 = 'https://api.mercadolibre.com/user-products/' + fullVari.user_product_id + '/stock';
          var resp2 = UrlFetchApp.fetch(url2, {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          });
          Logger.log('    /user-products/' + fullVari.user_product_id + '/stock → ' + resp2.getResponseCode());
          Logger.log('    Respuesta: ' + resp2.getContentText().substring(0, 1000));
        }
      } catch (err2) {
        Logger.log('    ERROR: ' + err2.message);
      }
    }

    Utilities.sleep(300);
  }
}

// ============================================================
// VINCULACION TIENDANUBE <-> MERCADOLIBRE
// ============================================================

/**
 * Trae TODOS los items de MercadoLibre con sus SKUs (seller_custom_field).
 * Devuelve un array de {itemId, titulo, sku, variacionId, variante, logisticType, stock, precio}
 */
function obtenerTodosItemsMeli_() {
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');

  // 1. Obtener todos los IDs de items (MeLi limita offset a 1000, usar scroll_id)
  var todosIds = [];
  var offset = 0;
  var limit = 100;
  var total = 0;
  var scrollId = null;

  // Primera página para saber el total
  var firstSearch = meliGet_('/users/' + userId + '/items/search?limit=' + limit + '&offset=0');
  todosIds = todosIds.concat(firstSearch.results || []);
  total = firstSearch.paging ? firstSearch.paging.total : 0;
  scrollId = firstSearch.scroll_id || null;

  // Si hay más de 1000, usar scroll_id
  if (total > 1000 && scrollId) {
    var hayMas = true;
    while (hayMas && todosIds.length < total) {
      Utilities.sleep(600);
      try {
        var scrollSearch = meliGet_('/users/' + userId + '/items/search?scroll_id=' + scrollId + '&limit=' + limit);
        var ids = scrollSearch.results || [];
        if (ids.length === 0) { hayMas = false; break; }
        todosIds = todosIds.concat(ids);
        scrollId = scrollSearch.scroll_id || scrollId;
      } catch (e) {
        Logger.log('Error en scroll: ' + e.message);
        hayMas = false;
      }
    }
  } else {
    // Menos de 1000, usar offset normal
    offset = 100;
    while (offset < total && offset < 1000) {
      Utilities.sleep(600);
      var intentoOffset = 0;
      var searchOk = false;
      while (intentoOffset < 3 && !searchOk) {
        try {
          var search = meliGet_('/users/' + userId + '/items/search?limit=' + limit + '&offset=' + offset);
          todosIds = todosIds.concat(search.results || []);
          searchOk = true;
        } catch (eOffset) {
          intentoOffset++;
          if (intentoOffset < 3) Utilities.sleep(3000 * intentoOffset);
          else throw eOffset;
        }
      }
      offset += limit;
    }
  }

  Logger.log('Total items MeLi encontrados: ' + todosIds.length);

  // 2. Traer detalle en lotes de 20
  var resultado = [];

  for (var batch = 0; batch < todosIds.length; batch += 20) {
    if (batch > 0) Utilities.sleep(600);
    var batchIds = todosIds.slice(batch, batch + 20);
    var items;
    var intentoBatch = 0;
    while (intentoBatch < 3) {
      try {
        items = meliGet_('/items?ids=' + batchIds.join(',') + '&attributes=id,title,price,original_price,available_quantity,shipping,variations,seller_custom_field,status,user_product_id');
        break;
      } catch (eBatch) {
        intentoBatch++;
        if (intentoBatch < 3) Utilities.sleep(3000 * intentoBatch);
        else throw eBatch;
      }
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i].body;
      if (!item) continue;

      var logisticType = (item.shipping && item.shipping.logistic_type) ? item.shipping.logistic_type : 'unknown';

      // Si tiene variaciones, una entrada por variación
      if (item.variations && item.variations.length > 0) {
        for (var v = 0; v < item.variations.length; v++) {
          var vari = item.variations[v];
          var sellerSku = vari.seller_custom_field || '';
          var attrs = (vari.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');

          resultado.push({
            itemId: item.id,
            titulo: item.title,
            sku: sellerSku,
            variacionId: vari.id,
            userProductId: vari.user_product_id || null,
            variante: attrs || '(Sin variante)',
            logisticType: logisticType,
            stock: vari.available_quantity || 0,
            precio: vari.original_price || vari.price || item.original_price || item.price || 0,
            estado: item.status || 'unknown'
          });
        }
      } else {
        // Sin variaciones — user_product_id viene a nivel item
        var skuItem = item.seller_custom_field || '';
        resultado.push({
          itemId: item.id,
          titulo: item.title,
          sku: skuItem,
          variacionId: null,
          userProductId: item.user_product_id || null,
          variante: '(Sin variante)',
          logisticType: logisticType,
          stock: item.available_quantity || 0,
          precio: item.original_price || item.price || 0,
          estado: item.status || 'unknown'
        });
      }
    }

    if (batch + 20 < todosIds.length) Utilities.sleep(300);
  }

  Logger.log('Total variaciones MeLi: ' + resultado.length);
  return resultado;
}

/**
 * EJECUTAR DESDE EL EDITOR.
 * Trae todas las publicaciones de MercadoLibre y las escribe en la hoja "Vinculaciones".
 * Agrega un desplegable con los SKUs de TiendaNube para vincular manualmente.
 *
 * ATENCION: puede tardar varios minutos si hay muchas publicaciones.
 */
function cargarPublicacionesMeli() {
  Logger.log('=== CARGANDO PUBLICACIONES MELI ===');

  // 1. Traer todos los items de MercadoLibre
  var itemsMeli = obtenerTodosItemsMeli_();
  Logger.log('Items MeLi con SKU: ' + itemsMeli.length);

  // 2. Obtener SKU + Variante de TiendaNube para el desplegable
  var sheetTN = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  var dataTN = sheetTN.getDataRange().getValues();
  var combinacionesTN = [];
  var seenTN = {};
  for (var i = 1; i < dataTN.length; i++) {
    var sku = dataTN[i][0].toString().trim();
    var variante = dataTN[i][2].toString().trim();
    if (sku) {
      var combo = sku + ' — ' + (variante || '(Sin variante)');
      if (!seenTN[combo]) {
        combinacionesTN.push(combo);
        seenTN[combo] = true;
      }
    }
  }
  combinacionesTN.sort();
  Logger.log('Combinaciones SKU+Variante TiendaNube: ' + combinacionesTN.length);

  // 3. Crear/limpiar hoja "Vinculaciones"
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Vinculaciones');

  // Leer vinculaciones existentes antes de borrar (para no perder trabajo manual)
  var vinculacionesPrevias = {};
  if (sheet) {
    var dataPrevia = sheet.getDataRange().getValues();
    for (var p = 1; p < dataPrevia.length; p++) {
      var keyPrev = (dataPrevia[p][0] || '').toString().trim(); // MLA ID
      var skuMeliPrev = (dataPrevia[p][2] || '').toString().trim(); // SKU MeLi
      var varMeliPrev = (dataPrevia[p][3] || '').toString().trim(); // Variante MeLi
      var vinculacionPrev = (dataPrevia[p][7] || '').toString().trim(); // Vinculación TN
      if (keyPrev && vinculacionPrev) {
        vinculacionesPrevias[keyPrev + '|||' + skuMeliPrev + '|||' + varMeliPrev] = vinculacionPrev;
      }
    }
    Logger.log('Vinculaciones previas recuperadas: ' + Object.keys(vinculacionesPrevias).length);
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Vinculaciones');
  }

  // 4. Headers
  var headers = [
    'MLA ID', 'Publicacion', 'SKU MeLi', 'Variante MeLi',
    'Stock', 'Precio', 'Tipo',
    'SKU — Variante TiendaNube',
    'Variacion ID', 'SKU Actualizado'
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4a86c8').setFontColor('white');
  sheet.setFrozenRows(1);

  // 5. Escribir datos
  var filas = [];
  for (var m = 0; m < itemsMeli.length; m++) {
    var item = itemsMeli[m];
    var tipo = item.logisticType === 'fulfillment' ? 'Full' : 'Deposito';

    // Buscar si había vinculación previa
    var keyBuscar = item.itemId + '|||' + item.sku + '|||' + item.variante;
    var skuTNPrevio = vinculacionesPrevias[keyBuscar] || '';

    filas.push([
      item.itemId,
      item.titulo,
      item.sku,
      item.variante,
      item.stock,
      item.precio,
      tipo,
      skuTNPrevio,
      item.variacionId || '',
      ''
    ]);
  }

  // Ordenar por SKU MeLi
  filas.sort(function(a, b) {
    return a[2].toString().localeCompare(b[2].toString());
  });

  if (filas.length > 0) {
    sheet.getRange(2, 1, filas.length, headers.length).setValues(filas);
  }

  // 6. Escribir combinaciones SKU+Variante de TN en hoja auxiliar para el desplegable
  var sheetSkus = ss.getSheetByName('_SKUs_TN');
  if (!sheetSkus) {
    sheetSkus = ss.insertSheet('_SKUs_TN');
  }
  sheetSkus.clear();
  sheetSkus.appendRow(['SKU — Variante TiendaNube']);
  if (combinacionesTN.length > 0) {
    var comboFilas = combinacionesTN.map(function(s) { return [s]; });
    sheetSkus.getRange(2, 1, comboFilas.length, 1).setValues(comboFilas);
  }
  sheetSkus.hideSheet();

  // Desplegable referenciando el rango de la hoja auxiliar
  if (filas.length > 0) {
    var rangoSkus = sheetSkus.getRange(2, 1, combinacionesTN.length, 1);
    var regla = SpreadsheetApp.newDataValidation()
      .requireValueInRange(rangoSkus, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, 8, filas.length, 1).setDataValidation(regla);
  }

  // 7. Formato
  sheet.getRange(2, 8, filas.length, 1).setBackground('#fff9c4'); // Amarillo claro para la columna editable
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 60);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 70);
  sheet.setColumnWidth(8, 200);

  // Ocultar columnas auxiliares (Variacion ID y SKU Actualizado)
  sheet.hideColumns(9, 2);

  // Colorear tipo
  for (var r = 2; r <= filas.length + 1; r++) {
    var tipoVal = sheet.getRange(r, 7).getValue();
    if (tipoVal === 'Full') {
      sheet.getRange(r, 7).setBackground('#e8f5e9').setFontColor('#2e7d32');
    } else {
      sheet.getRange(r, 7).setBackground('#e3f2fd').setFontColor('#1565c0');
    }
  }

  Logger.log('=== CARGA COMPLETADA ===');
  Logger.log('Hoja "Vinculaciones" creada con ' + filas.length + ' publicaciones.');
  Logger.log('Columna H (amarilla) = desplegable para vincular con SKU de TiendaNube.');
  Logger.log('Si ya había vinculaciones previas, se mantuvieron.');
}

// ============================================================
// ACTUALIZAR SKUS EN MERCADOLIBRE
// ============================================================

/**
 * EJECUTAR DESDE EL EDITOR.
 * Lee la hoja "Vinculaciones" y para cada fila que tenga un vínculo en columna H,
 * actualiza el SKU en MercadoLibre para que coincida con el SKU de TiendaNube.
 *
 * Solo actualiza las filas donde el SKU de MeLi sea diferente al SKU de TN.
 * Marca en columna J ("SKU Actualizado") el resultado.
 */
function actualizarSkusMeli() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vinculaciones');
  if (!sheet) throw new Error('No existe la hoja "Vinculaciones". Ejecutá cargarPublicacionesMeli primero.');

  var data = sheet.getDataRange().getValues();
  var actualizados = 0;
  var errores = 0;
  var omitidos = 0;

  Logger.log('=== ACTUALIZANDO SKUS EN MERCADOLIBRE ===');

  for (var i = 1; i < data.length; i++) {
    var mlaId = (data[i][0] || '').toString().trim();
    var skuMeli = (data[i][2] || '').toString().trim();
    var vinculacion = (data[i][7] || '').toString().trim(); // SKU — Variante TN
    var variacionId = (data[i][8] || '').toString().trim();
    var yaActualizado = (data[i][9] || '').toString().trim();

    // Saltar si no tiene vinculación
    if (!vinculacion || !mlaId) continue;

    // Extraer el SKU de TN (parte antes de " — ")
    var partes = vinculacion.split(' — ');
    var skuTN = partes[0].trim();

    // Saltar si el SKU ya es igual
    if (skuMeli === skuTN) {
      if (yaActualizado !== '✅ Igual') {
        sheet.getRange(i + 1, 10).setValue('✅ Igual');
      }
      omitidos++;
      continue;
    }

    // Saltar si ya fue actualizado exitosamente antes
    if (yaActualizado === '✅ ' + skuTN) {
      omitidos++;
      continue;
    }

    // Actualizar SKU en MercadoLibre
    try {
      if (variacionId) {
        // Tiene variación — actualizar la variación
        meliPut_('/items/' + mlaId + '/variations/' + variacionId, {
          seller_custom_field: skuTN
        });
      } else {
        // Sin variación — actualizar el item
        meliPut_('/items/' + mlaId, {
          seller_custom_field: skuTN
        });
      }

      // Marcar como actualizado
      sheet.getRange(i + 1, 3).setValue(skuTN); // Actualizar columna SKU MeLi
      sheet.getRange(i + 1, 10).setValue('✅ ' + skuTN);
      sheet.getRange(i + 1, 3).setBackground('#c8e6c9'); // Verde claro
      actualizados++;
      Logger.log('OK: ' + mlaId + ' — ' + skuMeli + ' → ' + skuTN);

    } catch (e) {
      var errorMsg = e.message || e.toString();
      sheet.getRange(i + 1, 10).setValue('❌ ' + errorMsg.substring(0, 100));
      sheet.getRange(i + 1, 3).setBackground('#ffcdd2'); // Rojo claro
      errores++;
      Logger.log('ERROR: ' + mlaId + ' — ' + errorMsg);
    }

    // Pausa para no saturar la API
    Utilities.sleep(500);
  }

  Logger.log('=== ACTUALIZACIÓN COMPLETADA ===');
  Logger.log('Actualizados: ' + actualizados);
  Logger.log('Omitidos (ya iguales): ' + omitidos);
  Logger.log('Errores: ' + errores);
}

/**
 * Función auxiliar para hacer PUT a la API de MercadoLibre.
 */
function meliPut_(endpoint, payload) {
  var token = PropertiesService.getScriptProperties().getProperty('MELI_ACCESS_TOKEN');
  if (!token) throw new Error('Token de MeLi no configurado.');

  var url = 'https://api.mercadolibre.com' + endpoint;
  var response = UrlFetchApp.fetch(url, {
    method: 'put',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code !== 200) {
    var body = response.getContentText();
    throw new Error('HTTP ' + code + ': ' + body);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Función auxiliar para hacer POST a la API de MercadoLibre.
 */
function meliPost_(endpoint, payload) {
  var token = getMeliToken_();
  var url = 'https://api.mercadolibre.com' + endpoint;
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var body = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('HTTP ' + code + ': ' + body);
  }
  return JSON.parse(body);
}

// ============================================================
// VINCULACION WEB - Funciones para Vincular.html
// ============================================================

/**
 * Carga todos los items de MeLi y los productos de TiendaNube
 * para mostrar en la interfaz web de vinculación.
 */
/**
 * Check liviano para detectar si hay productos nuevos sin recargar todo.
 * Devuelve conteos rápidos (no baja detalle de cada item).
 */
function chequearHayNovedades() {
  var userId = PropertiesService.getScriptProperties().getProperty('MELI_USER_ID');
  if (!userId) throw new Error('MeLi no configurado.');

  // 1. Total de items MeLi (una sola llamada liviana)
  var search = meliGet_('/users/' + userId + '/items/search?limit=1&offset=0');
  var totalMeLi = search.paging ? search.paging.total : 0;

  // 2. Sincronizar productos TN (esto es lo que detecta variantes nuevas)
  var r = null;
  try {
    r = sincronizarProductos();
  } catch (e) {
    // Si falla, no bloquear el check
  }

  return {
    totalMeLi: totalMeLi,
    totalTN: r ? r.totalTiendaNube : null,
    nuevosTN: r ? r.nuevosAgregados : 0,
    eliminadosTN: r ? r.eliminados : 0
  };
}

function obtenerDatosVinculacion() {
  // 0. Sincronizar productos de TiendaNube para tener data fresca
  try {
    sincronizarProductos();
  } catch (e) {
    Logger.log('Error al sincronizar productos TN: ' + e.message);
  }

  // 1. Traer items de MeLi
  var itemsMeli = obtenerTodosItemsMeli_();

  // 2. Traer productos de TiendaNube (de la hoja Productos)
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  var data = sheet.getDataRange().getValues();
  var productosTN = [];
  var seen = {};

  for (var i = 1; i < data.length; i++) {
    var sku = (data[i][0] || '').toString().trim();
    var nombre = (data[i][1] || '').toString().trim();
    var variante = (data[i][2] || '').toString().trim();

    if (sku) {
      // Mostrar todas las variantes y productos distintos (mismo SKU puede tener distinto nombre)
      var key = sku + '|||' + nombre + '|||' + variante;
      if (!seen[key]) {
        seen[key] = true;
        productosTN.push({ sku: sku, nombre: nombre, variante: variante });
      }
    }
  }

  productosTN.sort(function(a, b) {
    return a.sku.localeCompare(b.sku);
  });

  // 3. Traer composiciones existentes
  var composiciones = obtenerComposiciones();

  // 4. Leer mapa de vinculaciones TN (col H de Vinculaciones) → itemId|||variacionId → varianteTN
  var mapaVinculacionesTN = {};
  try {
    var sheetVinc = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vinculaciones');
    if (sheetVinc) {
      var dataVinc = sheetVinc.getDataRange().getValues();
      for (var v = 1; v < dataVinc.length; v++) {
        var mlaId   = (dataVinc[v][0] || '').toString().trim();
        var varId   = (dataVinc[v][8] || '').toString().trim();
        var vincTN  = (dataVinc[v][7] || '').toString().trim(); // col H: "SKU — Variante"
        if (!mlaId || !vincTN) continue;
        // Extraer solo la parte de variante (después del primer " — ")
        var guionIdx = vincTN.indexOf(' — ');
        var varianteTN = guionIdx >= 0 ? vincTN.substring(guionIdx + 3).trim() : '';
        var key = mlaId + '|||' + varId;
        if (varianteTN) mapaVinculacionesTN[key] = varianteTN;
      }
    }
  } catch(eVinc) {
    Logger.log('Error leyendo Vinculaciones para variantes TN: ' + eVinc.message);
  }

  return {
    itemsMeli: itemsMeli,
    productosTN: productosTN,
    composiciones: composiciones,
    mapaVinculacionesTN: mapaVinculacionesTN
  };
}

/**
 * Recibe un array de cambios desde la web y actualiza los SKUs en MercadoLibre.
 * Cada cambio tiene: {itemId, variacionId, skuActual, skuNuevo, titulo}
 * También actualiza la hoja "Vinculaciones" si existe.
 */
function ejecutarVinculacionWeb(cambios) {
  var resultados = [];

  for (var i = 0; i < cambios.length; i++) {
    var cambio = cambios[i];

    try {
      var success = false;

      if (cambio.variacionId) {
        // Intentar actualizar la variación directamente
        try {
          meliPut_('/items/' + cambio.itemId + '/variations/' + cambio.variacionId, {
            seller_custom_field: cambio.skuNuevo
          });
          success = true;
        } catch (e1) {
          // Si falla (común en Full), intentar via el item completo con la variación
          Logger.log('Intento directo falló para ' + cambio.itemId + ', intentando via item: ' + e1.message);
          try {
            // Obtener la variación actual para preservar attribute_combinations
            var itemData = meliGet_('/items/' + cambio.itemId);
            var variaciones = itemData.variations || [];
            var varActualizada = null;

            for (var v = 0; v < variaciones.length; v++) {
              if (String(variaciones[v].id) === String(cambio.variacionId)) {
                variaciones[v].seller_custom_field = cambio.skuNuevo;
                varActualizada = variaciones[v];
                break;
              }
            }

            if (varActualizada) {
              meliPut_('/items/' + cambio.itemId, {
                variations: [varActualizada]
              });
              success = true;
            } else {
              throw new Error('Variación ' + cambio.variacionId + ' no encontrada en el item');
            }
          } catch (e2) {
            throw new Error(e2.message || e2.toString());
          }
        }
      } else {
        // Sin variaciones: actualizar directo
        meliPut_('/items/' + cambio.itemId, {
          seller_custom_field: cambio.skuNuevo
        });
        success = true;
      }

      resultados.push({
        success: success,
        itemId: cambio.itemId,
        titulo: cambio.titulo,
        skuActual: cambio.skuActual,
        skuNuevo: cambio.skuNuevo,
        vinculacionTN: cambio.vinculacionTN || '',
        variacionId: cambio.variacionId || '',
        variante: cambio.variante || '(Sin variante)',
        stock: cambio.stock || 0,
        precio: cambio.precio || 0,
        tipo: cambio.tipo || 'Deposito'
      });

      Logger.log('Vinculado OK: ' + cambio.itemId + ' — ' + cambio.skuActual + ' → ' + cambio.skuNuevo);

    } catch (e) {
      resultados.push({
        success: false,
        itemId: cambio.itemId,
        titulo: cambio.titulo,
        skuActual: cambio.skuActual,
        skuNuevo: cambio.skuNuevo,
        error: e.message || e.toString()
      });

      Logger.log('Error vinculando ' + cambio.itemId + ': ' + e.message);
    }

    // Pausa para no saturar la API
    if (i < cambios.length - 1) Utilities.sleep(500);
  }

  // Actualizar hoja Vinculaciones si existe
  try {
    actualizarHojaVinculaciones_(resultados);
  } catch (e) {
    Logger.log('No se pudo actualizar hoja Vinculaciones: ' + e.message);
  }

  return resultados;
}

/**
 * Vinculación solo interna (para publicaciones cerradas o no editables en MeLi).
 * Guarda en la hoja Vinculaciones sin llamar a la API de MeLi.
 */
function vincularSoloInterno(cambios) {
  var resultados = [];

  for (var i = 0; i < cambios.length; i++) {
    var cambio = cambios[i];
    resultados.push({
      success: true,
      itemId: cambio.itemId,
      titulo: cambio.titulo,
      skuActual: cambio.skuActual,
      skuNuevo: cambio.skuNuevo,
      vinculacionTN: cambio.vinculacionTN || '',
      variacionId: cambio.variacionId || '',
      variante: cambio.variante || '(Sin variante)',
      stock: cambio.stock || 0,
      precio: cambio.precio || 0,
      tipo: cambio.tipo || 'Deposito',
      interno: true
    });
    Logger.log('Vinculado INTERNO: ' + cambio.itemId + ' — ' + cambio.skuActual + ' → ' + cambio.skuNuevo);
  }

  // Guardar en hoja Vinculaciones
  try {
    actualizarHojaVinculaciones_(resultados);
  } catch (e) {
    Logger.log('No se pudo actualizar hoja Vinculaciones: ' + e.message);
  }

  return resultados;
}

/**
 * Actualiza la hoja "Vinculaciones" con los resultados de la vinculación web.
 * Si la fila no existe en la hoja, la crea automáticamente.
 */
function actualizarHojaVinculaciones_(resultados) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vinculaciones');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();

  for (var r = 0; r < resultados.length; r++) {
    var res = resultados[r];
    if (!res.success) continue;

    // Buscar la fila por MLA ID + Variacion ID
    var encontrada = false;
    var varIdRes = (res.variacionId || '').toString().trim();

    for (var i = 1; i < data.length; i++) {
      var mlaId = (data[i][0] || '').toString().trim();
      var varIdHoja = (data[i][8] || '').toString().trim();

      // Matchear por MLA ID y Variacion ID (si tiene)
      if (mlaId === res.itemId && (!varIdRes || varIdHoja === varIdRes)) {
        sheet.getRange(i + 1, 3).setValue(res.skuNuevo);
        var marca = res.interno ? '🔗 ' + res.skuNuevo + ' (interno)' : '✅ ' + res.skuNuevo;
        sheet.getRange(i + 1, 10).setValue(marca);
        sheet.getRange(i + 1, 3).setBackground(res.interno ? '#fff9c4' : '#c8e6c9');
        // Guardar vinculación TN en columna H
        if (res.vinculacionTN) {
          sheet.getRange(i + 1, 8).setValue(res.vinculacionTN);
        }
        encontrada = true;
      }
    }

    // Si no existe la fila, crearla
    if (!encontrada) {
      var skuVinculado = res.skuNuevo || '';
      var marca = res.interno ? '🔗 ' + skuVinculado + ' (interno)' : '✅ ' + skuVinculado;
      var nuevaFila = [
        res.itemId,                          // A: MLA ID
        res.titulo || '',                    // B: Publicacion
        res.skuNuevo || '',                  // C: SKU MeLi (ya vinculado)
        res.variante || '(Sin variante)',    // D: Variante MeLi
        res.stock || 0,                      // E: Stock
        res.precio || 0,                     // F: Precio
        res.tipo || 'Deposito',              // G: Tipo
        res.vinculacionTN || '',               // H: SKU — Variante TN
        res.variacionId || '',               // I: Variacion ID
        marca                                // J: SKU Actualizado
      ];
      sheet.appendRow(nuevaFila);
      var newRow = sheet.getLastRow();
      sheet.getRange(newRow, 3).setBackground(res.interno ? '#fff9c4' : '#c8e6c9');
      Logger.log('Fila nueva creada en Vinculaciones para ' + res.itemId);
    }
  }
}

/**
 * EJECUTAR DESDE EL EDITOR (▶️) para actualizar los precios en la hoja Vinculaciones.
 * Lee todos los MLA ID únicos de la hoja, consulta el original_price (precio sin descuento)
 * de MeLi y lo actualiza en la columna F (Precio).
 */
function actualizarPreciosVinculaciones() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vinculaciones');
  if (!sheet) { Logger.log('No existe la hoja Vinculaciones'); return; }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) { Logger.log('Hoja Vinculaciones vacía'); return; }

  // Recolectar todos los MLA IDs únicos y sus filas
  var mapaItems = {}; // mlaId → [rowIndex, ...]
  for (var i = 1; i < data.length; i++) {
    var mlaId = (data[i][0] || '').toString().trim();
    if (!mlaId) continue;
    if (!mapaItems[mlaId]) mapaItems[mlaId] = [];
    mapaItems[mlaId].push(i);
  }

  var ids = Object.keys(mapaItems);
  if (ids.length === 0) { Logger.log('Sin MLA IDs en Vinculaciones'); return; }

  Logger.log('Actualizando precios de ' + ids.length + ' publicaciones...');
  var actualizados = 0;

  // Traer en lotes de 20
  for (var batch = 0; batch < ids.length; batch += 20) {
    var lote = ids.slice(batch, batch + 20);
    try {
      var items = meliGet_('/items?ids=' + lote.join(',') + '&attributes=id,price,original_price,variations');
      for (var x = 0; x < items.length; x++) {
        var item = items[x].body;
        if (!item) continue;
        var mlaId = item.id;
        var filas = mapaItems[mlaId] || [];

        // Armar mapa variacionId → precio
        var mapaVariPrecio = {};
        if (item.variations && item.variations.length > 0) {
          for (var v = 0; v < item.variations.length; v++) {
            var vari = item.variations[v];
            mapaVariPrecio[vari.id.toString()] = vari.original_price || vari.price || item.original_price || item.price || 0;
          }
        }
        var precioItem = item.original_price || item.price || 0;

        for (var f = 0; f < filas.length; f++) {
          var rowIdx = filas[f];
          var variacionId = (data[rowIdx][8] || '').toString().trim();
          var precio = (variacionId && mapaVariPrecio[variacionId]) ? mapaVariPrecio[variacionId] : precioItem;
          if (precio > 0) {
            sheet.getRange(rowIdx + 1, 6).setValue(precio);
            actualizados++;
          }
        }
      }
    } catch(e) {
      Logger.log('Error en lote ' + lote.join(',') + ': ' + e.message);
    }
  }

  Logger.log('✅ Precios actualizados: ' + actualizados + ' filas en Vinculaciones');
}

/**
 * EJECUTAR UNA VEZ desde el editor (▶️).
 * Recorre la hoja Vinculaciones y para cada fila que tenga SKU (columna C)
 * pero NO tenga vinculación TN (columna H vacía), intenta llenarla automáticamente
 * buscando la variante de TN que mejor matchee con la variante de MeLi.
 */
function completarVinculacionesTN() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Leer hoja Productos (variantes de TiendaNube)
  var prodSheet = ss.getSheetByName('Productos');
  if (!prodSheet) throw new Error('No existe la hoja Productos');
  var prodData = prodSheet.getDataRange().getValues();

  // Armar mapa: SKU → [{variante, nombre}]
  var variantesTN = {};
  for (var p = 1; p < prodData.length; p++) {
    var skuP = (prodData[p][0] || '').toString().trim();
    var nombreP = (prodData[p][1] || '').toString().trim();
    var varP = (prodData[p][2] || '').toString().trim();
    if (!skuP) continue;
    if (!variantesTN[skuP]) variantesTN[skuP] = [];
    variantesTN[skuP].push({ variante: varP, nombre: nombreP });
  }

  // 2. Leer hoja Vinculaciones
  var vincSheet = ss.getSheetByName('Vinculaciones');
  if (!vincSheet) throw new Error('No existe la hoja Vinculaciones');
  var vincData = vincSheet.getDataRange().getValues();

  var completadas = 0;
  var sinMatch = 0;
  var yaCompletas = 0;

  for (var i = 1; i < vincData.length; i++) {
    var skuMeli = (vincData[i][2] || '').toString().trim();     // C: SKU MeLi
    var varMeli = (vincData[i][3] || '').toString().trim();     // D: Variante MeLi
    var colH = (vincData[i][7] || '').toString().trim();        // H: Vinculación TN

    // Si ya tiene columna H, saltar
    if (colH) { yaCompletas++; continue; }

    // Si no tiene SKU, saltar
    if (!skuMeli) continue;

    // Buscar variantes de TN para este SKU
    var candidatas = variantesTN[skuMeli];
    if (!candidatas || candidatas.length === 0) continue;

    // Si solo hay una variante, usar esa directamente
    if (candidatas.length === 1) {
      var vinc = skuMeli + ' — ' + candidatas[0].variante;
      vincSheet.getRange(i + 1, 8).setValue(vinc);
      completadas++;
      continue;
    }

    // Varias variantes: buscar la que mejor matchee con la variante de MeLi
    var varMeliUp = varMeli.toUpperCase();
    var mejorMatch = null;
    var mejorScore = 0;

    for (var c = 0; c < candidatas.length; c++) {
      var varTNUp = candidatas[c].variante.toUpperCase();
      var score = 0;

      // Match exacto
      if (varTNUp === varMeliUp) {
        score = 100;
      }
      // Uno contiene al otro
      else if (varMeliUp.indexOf(varTNUp) !== -1 || varTNUp.indexOf(varMeliUp) !== -1) {
        score = 80;
      }
      // Match por palabras en común
      else {
        var palabrasTN = varTNUp.split(/[\s\/,]+/);
        var palabrasMeli = varMeliUp.split(/[\s\/,]+/);
        var coincidencias = 0;
        for (var w = 0; w < palabrasTN.length; w++) {
          if (palabrasTN[w].length < 2) continue;
          for (var ww = 0; ww < palabrasMeli.length; ww++) {
            if (palabrasTN[w] === palabrasMeli[ww]) {
              coincidencias++;
              break;
            }
          }
        }
        if (palabrasTN.length > 0) {
          score = Math.round((coincidencias / palabrasTN.length) * 60);
        }
      }

      if (score > mejorScore) {
        mejorScore = score;
        mejorMatch = candidatas[c];
      }
    }

    if (mejorMatch && mejorScore >= 40) {
      var vinc = skuMeli + ' — ' + mejorMatch.variante;
      vincSheet.getRange(i + 1, 8).setValue(vinc);
      completadas++;
    } else {
      sinMatch++;
      Logger.log('Sin match para fila ' + (i+1) + ': SKU=' + skuMeli + ', Variante MeLi=' + varMeli);
    }
  }

  Logger.log('✅ Completadas: ' + completadas + ' | Ya tenían: ' + yaCompletas + ' | Sin match: ' + sinMatch);
  return { completadas: completadas, yaCompletas: yaCompletas, sinMatch: sinMatch };
}

/**
 * Guarda la vinculación TN (columna H) para un item que ya tiene el SKU correcto.
 * Se llama cuando el usuario selecciona la variante de TN en el desplegable
 * pero el SKU ya coincide (no necesita llamar a la API de MeLi).
 */
function guardarVinculacionTN(mlaId, variacionId, vinculacionTN) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vinculaciones');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var varId = (variacionId || '').toString().trim();

  for (var i = 1; i < data.length; i++) {
    var rowMla = (data[i][0] || '').toString().trim();
    var rowVarId = (data[i][8] || '').toString().trim();

    if (rowMla === mlaId && (!varId || rowVarId === varId)) {
      sheet.getRange(i + 1, 8).setValue(vinculacionTN);
      Logger.log('Vinculación TN guardada: ' + mlaId + ' → ' + vinculacionTN);
      return;
    }
  }

  Logger.log('No se encontró fila para ' + mlaId + ' en Vinculaciones');
}

// ============================================================
// CONFIGURACION INICIAL (ejecutar una sola vez)
// ============================================================

/**
 * Ejecutar esta funcion UNA VEZ desde el editor de Apps Script
 * para guardar el token de TiendaNube de forma segura.
 */
function configurarToken() {
  var token = PropertiesService.getScriptProperties().getProperty('TIENDANUBE_TOKEN');
  if (token) {
    Logger.log('Token ya configurado. Store ID: ' + TIENDANUBE_STORE_ID);
  } else {
    Logger.log('Token NO configurado. Usar setTokenManual() para configurarlo.');
  }
}

/**
 * Ejecutar esta funcion para setear el token manualmente.
 * Pegar el token real en la variable de abajo.
 */
function setTokenManual() {
  var token = '1080f31a6f5086ad525cf03b3113c8c29800d204';
  PropertiesService.getScriptProperties().setProperty('TIENDANUBE_TOKEN', token);
  Logger.log('Token guardado correctamente.');
}

// ============================================================
// COMPOSICIONES (Combos y Packs)
// La composición va por PUBLICACION (MLA ID), no por SKU,
// porque un mismo SKU puede venderse en distintas cantidades
// según la publicación.
// ============================================================

/**
 * Obtiene la hoja "Composiciones", la crea si no existe.
 * Columnas: A: MLA ID | B: Variación ID | C: SKU MeLi | D: SKU Componente TN | E: Cantidad
 */
function getHojaComposiciones_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Composiciones');
  if (!sheet) {
    sheet = ss.insertSheet('Composiciones');
    sheet.getRange('A1:E1').setValues([['MLA ID', 'Variación ID', 'SKU MeLi', 'SKU Componente TN', 'Cantidad']]);
    sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#e8f5e9');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 140);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(5, 80);
  }
  return sheet;
}

/**
 * Guarda la composición de una publicación de MeLi.
 * Borra las entradas anteriores de la misma publicación y graba las nuevas.
 * @param {Object} publi - {itemId, variacionId, skuMeli}
 * @param {Array} componentes - [{sku: 'ABC', cantidad: 2}, ...]
 */
function guardarComposicion(publi, componentes) {
  var sheet = getHojaComposiciones_();
  var data = sheet.getDataRange().getValues();
  var clavePubli = publi.itemId + '|' + (publi.variacionId || '');

  // Borrar filas existentes de esta publicación (de abajo hacia arriba)
  for (var i = data.length - 1; i >= 1; i--) {
    var claveFila = (data[i][0] || '').toString().trim() + '|' + (data[i][1] || '').toString().trim();
    if (claveFila === clavePubli) {
      sheet.deleteRow(i + 1);
    }
  }

  // Si no hay componentes, solo borramos
  if (!componentes || componentes.length === 0) {
    Logger.log('Composición eliminada para: ' + publi.itemId);
    return { success: true, action: 'deleted' };
  }

  // Agregar nuevas filas
  var filas = [];
  for (var j = 0; j < componentes.length; j++) {
    var comp = componentes[j];
    if (comp.sku && comp.cantidad > 0) {
      filas.push([publi.itemId, publi.variacionId || '', publi.skuMeli || '', comp.sku, comp.cantidad]);
    }
  }

  if (filas.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, filas.length, 5).setValues(filas);
  }

  Logger.log('Composición guardada para ' + publi.itemId + ': ' + filas.length + ' componentes');
  return { success: true, action: 'saved', count: filas.length };
}

/**
 * Obtiene todas las composiciones existentes.
 * Retorna un objeto indexado por "MLAID|VARIACIONID":
 * { 'MLA123|456': [{sku: 'COMP1', cantidad: 2}, ...], ... }
 */
function obtenerComposiciones() {
  var sheet = getHojaComposiciones_();
  var data = sheet.getDataRange().getValues();
  var result = {};

  for (var i = 1; i < data.length; i++) {
    var mlaId = (data[i][0] || '').toString().trim();
    var varId = (data[i][1] || '').toString().trim();
    var skuComp = (data[i][3] || '').toString().trim();
    var cantidad = parseFloat(data[i][4]) || 1;
    var clave = mlaId + '|' + varId;

    if (mlaId && skuComp) {
      if (!result[clave]) result[clave] = [];
      result[clave].push({ sku: skuComp, cantidad: cantidad });
    }
  }

  return result;
}

// ============================================================
// PUBLICAR EN MELI - Funciones para Publicar.html
// ============================================================

/**
 * Busca productos en TiendaNube por nombre o SKU.
 * Retorna un resumen liviano para mostrar en la lista de selección.
 */
function buscarProductosTN(query) {
  var token = getTiendaNubeToken_();
  if (!token) throw new Error('Token de TiendaNube no configurado.');
  if (!query || query.trim().length < 2) return [];

  var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID +
    '/products?q=' + encodeURIComponent(query.trim()) + '&per_page=30';
  var response = UrlFetchApp.fetch(url, {
    headers: {
      'Authentication': 'bearer ' + token,
      'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Error buscando productos TN: ' + response.getContentText());
  }

  var prods = JSON.parse(response.getContentText());
  return prods.map(function(p) {
    var nombre = (p.name && (p.name.es || p.name.pt)) || '';
    var imagen = (p.images && p.images.length > 0) ? p.images[0].src : '';
    var variants = p.variants || [];
    var precio = 0, stockTotal = 0, skuPrincipal = '';
    for (var v = 0; v < variants.length; v++) {
      var vv = variants[v];
      if (!precio && vv.price) precio = parseFloat(vv.price) || 0;
      if (vv.stock) stockTotal += parseInt(vv.stock, 10) || 0;
      if (!skuPrincipal && vv.sku) skuPrincipal = vv.sku;
    }
    return {
      id: p.id,
      nombre: nombre,
      skuPrincipal: skuPrincipal,
      precio: precio,
      stockTotal: stockTotal,
      imagen: imagen,
      variantesCount: variants.length
    };
  });
}

/**
 * Obtiene los detalles completos de un producto TN por ID.
 * Se llama cuando el usuario selecciona el producto en el paso 1.
 */
function obtenerProductoTNDetalle(tnProductId) {
  var token = getTiendaNubeToken_();
  if (!token) throw new Error('Token de TiendaNube no configurado.');

  var url = 'https://api.tiendanube.com/v1/' + TIENDANUBE_STORE_ID + '/products/' + tnProductId;
  var response = UrlFetchApp.fetch(url, {
    headers: {
      'Authentication': 'bearer ' + token,
      'User-Agent': 'Claudio (marina@tucumantextil.com.ar)',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Error obteniendo producto TN: ' + response.getContentText());
  }

  var p = JSON.parse(response.getContentText());
  var nombre = (p.name && (p.name.es || p.name.pt)) || '';

  // Strip HTML de la descripcion
  var descHtml = (p.description && (p.description.es || p.description.pt)) || '';
  if (typeof descHtml !== 'string') descHtml = '';
  var descripcion = descHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // Imagenes
  var imagenes = (p.images || []).map(function(img) { return img.src; }).slice(0, 12);

  // Nombres de dimensiones (ej: ["Tamanio", "Color"])
  var atributosNombres = [];
  if (p.attributes && Array.isArray(p.attributes)) {
    for (var a = 0; a < p.attributes.length; a++) {
      var attr = p.attributes[a];
      var attrNombre = (typeof attr === 'object') ? (attr.es || attr.pt || attr.name || '') : attr;
      if (typeof attrNombre === 'object') attrNombre = attrNombre.es || attrNombre.pt || '';
      atributosNombres.push(attrNombre.toString().trim());
    }
  }

  // Variantes
  var variantes = (p.variants || []).map(function(v) {
    var valores = (v.values || []).map(function(val) {
      return val.es || val.pt || val.toString() || '';
    });
    return {
      id: v.id,
      sku: v.sku || '',
      precio: parseFloat(v.price) || 0,
      stock: parseInt(v.stock, 10) || 0,
      valores: valores,
      nombre: valores.join(' / ')
    };
  });

  return {
    id: p.id,
    nombre: nombre,
    descripcion: descripcion,
    imagenes: imagenes,
    variantes: variantes,
    atributosNombres: atributosNombres,
    tieneVariantes: variantes.length > 1 && atributosNombres.length > 0
  };
}

/**
 * Busca categorias de MercadoLibre usando domain_discovery.
 */
function buscarCategoriasMeli(query) {
  if (!query || query.trim().length < 2) return [];
  var seen = {}, cats = [];
  var q = query.trim();

  // Approach 1: domain_discovery (funciona bien con titulos de productos)
  try {
    var dd = meliGet_('/sites/MLA/domain_discovery/search?q=' + encodeURIComponent(q) + '&limit=10');
    if (Array.isArray(dd)) {
      for (var i = 0; i < dd.length; i++) {
        var r = dd[i];
        if (r.category_id && !seen[r.category_id]) {
          seen[r.category_id] = true;
          cats.push({ id: r.category_id, nombre: r.category_name || r.category_id,
            dominio: r.domain_name || r.domain_id || '' });
        }
      }
    }
  } catch (e) { Logger.log('domain_discovery error: ' + e.message); }

  // Approach 2: search endpoint → extrae los filtros de categoria de los resultados
  try {
    var search = meliGet_('/sites/MLA/search?q=' + encodeURIComponent(q) + '&limit=1');
    var filters = (search.available_filters || []).concat(search.filters || []);
    for (var f = 0; f < filters.length; f++) {
      if (filters[f].id === 'category') {
        var vals = filters[f].values || [];
        for (var v = 0; v < vals.length; v++) {
          var cv = vals[v];
          if (cv.id && !seen[cv.id]) {
            seen[cv.id] = true;
            cats.push({ id: cv.id, nombre: cv.name,
              dominio: cv.results ? cv.results + ' publicaciones' : '' });
          }
        }
        break;
      }
    }
  } catch (e2) { Logger.log('search categories error: ' + e2.message); }

  return cats;
}

/**
 * Obtiene las categorias raiz de MeLi (primer nivel del arbol).
 */
function obtenerCategoriasRaizMeli() {
  try {
    var cats = meliGet_('/sites/MLA/categories');
    return cats.map(function(c) { return { id: c.id, nombre: c.name }; });
  } catch (e) {
    Logger.log('obtenerCategoriasRaizMeli error: ' + e.message);
    throw new Error('No se pudieron cargar las categorias: ' + e.message);
  }
}

/**
 * Navega dentro de una categoria: devuelve sus hijos y la ruta completa.
 */
function obtenerSubcategoriasMeli(categoryId) {
  try {
    var data = meliGet_('/categories/' + categoryId);
    return {
      id: data.id,
      nombre: data.name,
      ruta: (data.path_from_root || []).map(function(p) { return { id: p.id, nombre: p.name }; }),
      hijos: (data.children_categories || []).map(function(c) { return { id: c.id, nombre: c.name }; })
    };
  } catch (e) {
    Logger.log('obtenerSubcategoriasMeli error: ' + e.message);
    throw new Error('No se pudo cargar la categoria: ' + e.message);
  }
}

/**
 * Obtiene los atributos de una categoria MeLi.
 * Retorna: requeridos (para el producto) y variacion (para las variantes).
 */
function obtenerAtributosCategoriasMeli(categoryId) {
  if (!categoryId) return { requeridos: [], opcionales: [], variacion: [] };
  try {
    var attrs = meliGet_('/categories/' + categoryId + '/attributes');
    var requeridos = [], opcionales = [], variacion = [];

    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var tags = attr.tags || {};
      if (tags.hidden || tags.read_only) continue;

      var item = {
        id: attr.id,
        nombre: attr.name,
        tipo: attr.value_type || 'string',
        requerido: !!(tags.required || tags.catalog_required),
        valoresPermitidos: []
      };

      if (attr.values && attr.values.length > 0) {
        item.valoresPermitidos = attr.values.slice(0, 150).map(function(v) {
          return { id: v.id, nombre: v.name };
        });
      }

      if (tags.allow_variations) {
        variacion.push(item);
      } else if (tags.required || tags.catalog_required) {
        requeridos.push(item);
      } else {
        opcionales.push(item);
      }
    }
    return { requeridos: requeridos, opcionales: opcionales, variacion: variacion };
  } catch (e) {
    Logger.log('obtenerAtributosCategoriasMeli error: ' + e.message);
    return { requeridos: [], opcionales: [], variacion: [] };
  }
}

/**
 * Verifica si una categoría de MeLi requiere catálogo (no permite title libre).
 * Devuelve { requiereCatalogo: bool }
 */
function checkCategoriaCatalogo(categoryId) {
  try {
    var cat = meliGet_('/categories/' + categoryId);
    var settings = cat.settings || {};
    // Loguear todos los campos para identificar el correcto
    Logger.log('Categoría ' + categoryId + ' settings completos: ' + JSON.stringify(settings));
    Logger.log('Categoría ' + categoryId + ' root fields: catalog_listing=' + cat.catalog_listing + ' | domain_id=' + cat.domain_id);
    // Chequeamos varios campos posibles
    var req = settings.catalog_listing === true
           || settings.catalog_listing_allowed === false
           || cat.catalog_listing === true;
    return { requiereCatalogo: req };
  } catch(e) {
    Logger.log('checkCategoriaCatalogo error: ' + e.message);
    return { requiereCatalogo: false };
  }
}

/**
 * Busca productos en el catálogo de MercadoLibre para una categoría.
 * Necesario para categorías controladas por catálogo (donde title no se puede fijar libremente).
 */
function buscarProductoCatalogMeli(query, categoryId) {
  var url = '/products/search?status=active&site_id=MLA&q=' + encodeURIComponent(query);
  if (categoryId) url += '&category_id=' + encodeURIComponent(categoryId);
  var res = meliGet_(url);
  var results = (res.results || []).slice(0, 20);
  return results.map(function(p) {
    var img = '';
    if (p.pictures && p.pictures.length > 0)
      img = p.pictures[0].url || p.pictures[0].secure_url || '';
    var attrs = (p.attributes || []).slice(0, 5)
      .map(function(a) { return a.value_name; }).filter(Boolean).join(' · ');
    return { id: p.id, nombre: p.name || '', imagen: img, atributos: attrs };
  });
}

/**
 * Publica un producto en MercadoLibre y auto-vincula en la hoja Vinculaciones.
 *
 * datos = {
 *   titulo, categoryId, descripcion, imagenes,
 *   catalogProductId,            <- opcional; si está presente, categoría de catálogo
 *   atributos: [{id, value_name, value_id?}],
 *   flex: bool,
 *   variantes: [{sku, precio, stock, tnVariantNombre, attribute_combinations}] | null,
 *   precio, stock, skuTN   <- para producto simple
 * }
 */
function publicarEnMeli(datos) {
  if (!datos.titulo) throw new Error('Falta el titulo');
  if (!datos.categoryId) throw new Error('Falta la categoria');

  // Payload base compartido por todos los items
  var baseShipping = {
    mode: 'me2',
    free_shipping: false,
    local_pick_up: false,
    logistic_type: 'drop_off'
  };
  if (datos.largo && datos.ancho && datos.alto && datos.peso)
    baseShipping.dimensions = datos.largo + 'x' + datos.ancho + 'x' + datos.alto + ',' + datos.peso;
  if (datos.flex) baseShipping.tags = ['flex_mandatory'];

  var esCatalogo = !!datos.catalogProductId;

  var catAttrs = (datos.atributos || [])
    .filter(function(a) { return a.id && (a.value_id || a.value_name); })
    .map(function(a) {
      var obj = { id: a.id };
      if (a.value_id) { obj.value_id = a.value_id; obj.value_name = a.value_name; }
      else obj.value_name = a.value_name;
      return obj;
    });

  var resultadosVinc = [];
  var primerResultado = null;

  if (esCatalogo) {
    // ── CATÁLOGO ─────────────────────────────────────────────────────────
    // Los items de catálogo NO son User Products → modelo clásico:
    // un solo POST con catalog_product_id + variations[] (sin family_name, sin title).
    var payloadCat = {
      catalog_product_id: datos.catalogProductId,
      category_id: datos.categoryId,
      currency_id: 'ARS',
      buying_mode: 'buy_it_now',
      listing_type_id: 'gold_special',
      condition: 'new',
      pictures: (datos.imagenes || []).slice(0, 12).map(function(u) { return { source: u }; }),
      shipping: baseShipping,
      attributes: catAttrs
    };

    if (datos.variantes && datos.variantes.length > 0) {
      // Con variantes: precio mínimo al root + array variations
      payloadCat.price = datos.variantes.reduce(function(min, v) {
        return v.precio < min ? v.precio : min;
      }, datos.variantes[0].precio);
      payloadCat.available_quantity = datos.variantes.reduce(function(sum, v) {
        return sum + (v.stock || 0);
      }, 0);
      payloadCat.variations = datos.variantes.map(function(v) {
        var obj = {
          attribute_combinations: v.attribute_combinations,
          price: v.precio,
          available_quantity: v.stock || 0
        };
        if (v.sku) obj.seller_custom_field = v.sku;
        return obj;
      });
    } else {
      payloadCat.price = datos.precio;
      payloadCat.available_quantity = datos.stock || 0;
      if (datos.skuTN) payloadCat.seller_custom_field = datos.skuTN;
    }

    Logger.log('Publicando como CATALOGO: ' + datos.catalogProductId);
    Logger.log('Payload: ' + JSON.stringify(payloadCat));
    var resCat = meliPost_('/items', payloadCat);
    if (!resCat.id) throw new Error('MeLi no devolvio un ID de publicacion');
    primerResultado = resCat;

    if (datos.variantes && datos.variantes.length > 0) {
      var varsPublicadas = resCat.variations || [];
      for (var vi = 0; vi < varsPublicadas.length; vi++) {
        var vp = varsPublicadas[vi];
        var skuVar = vp.seller_custom_field || '';
        var meliVarNombre = (vp.attribute_combinations || []).map(function(a) { return a.value_name; }).join(' / ');
        var tnVarNombre = meliVarNombre;
        for (var vj = 0; vj < datos.variantes.length; vj++) {
          if (datos.variantes[vj].sku === skuVar) { tnVarNombre = datos.variantes[vj].tnVariantNombre || meliVarNombre; break; }
        }
        resultadosVinc.push({
          success: true, itemId: resCat.id,
          titulo: datos.titulo || datos.catalogProductId,
          skuActual: skuVar, skuNuevo: skuVar, variante: meliVarNombre,
          variacionId: vp.id ? vp.id.toString() : '',
          stock: vp.available_quantity || 0, precio: vp.price || payloadCat.price,
          tipo: 'Deposito',
          vinculacionTN: skuVar ? (skuVar + ' — ' + tnVarNombre) : ''
        });
      }
    } else {
      resultadosVinc.push({
        success: true, itemId: resCat.id,
        titulo: datos.titulo || datos.catalogProductId,
        skuActual: datos.skuTN || '', skuNuevo: datos.skuTN || '',
        variante: '(Sin variante)', variacionId: '',
        stock: datos.stock || 0, precio: datos.precio || 0,
        tipo: 'Deposito',
        vinculacionTN: datos.skuTN ? (datos.skuTN + ' — (Sin variante)') : ''
      });
    }

  } else if (datos.variantes && datos.variantes.length > 0) {
    // ── USER PRODUCTS (no catálogo, con variantes) ────────────────────────
    // Cuenta habilitada para Precio por Variación:
    // un item separado por variante, todos con el mismo family_name.
    var familyName = 'TT-' + Date.now();

    for (var i = 0; i < datos.variantes.length; i++) {
      var v = datos.variantes[i];

      var variantAttrs = catAttrs.slice();
      var combos = v.attribute_combinations || [];
      for (var ac = 0; ac < combos.length; ac++) { variantAttrs.push(combos[ac]); }

      var itemPayload = {
        title: datos.titulo,
        category_id: datos.categoryId,
        currency_id: 'ARS',
        buying_mode: 'buy_it_now',
        listing_type_id: 'gold_special',
        condition: 'new',
        family_name: familyName,
        price: v.precio,
        available_quantity: v.stock || 0,
        description: { plain_text: (datos.descripcion || '').substring(0, 50000) },
        pictures: (datos.imagenes || []).slice(0, 12).map(function(u) { return { source: u }; }),
        shipping: baseShipping,
        attributes: variantAttrs
      };
      if (v.sku) itemPayload.seller_custom_field = v.sku;

      Logger.log('Publicando variante ' + (i+1) + '/' + datos.variantes.length + ': ' + (v.tnVariantNombre || '') + ' — $' + v.precio);
      Logger.log('Payload: ' + JSON.stringify(itemPayload));
      var res = meliPost_('/items', itemPayload);
      if (!res.id) throw new Error('MeLi no devolvio ID para variante ' + (v.tnVariantNombre || (i+1)));
      Logger.log('Variante publicada: ' + res.id);

      if (!primerResultado) primerResultado = res;
      resultadosVinc.push({
        success: true, itemId: res.id,
        titulo: datos.titulo, skuActual: v.sku || '', skuNuevo: v.sku || '',
        variante: v.tnVariantNombre || '', variacionId: '',
        stock: v.stock || 0, precio: v.precio, tipo: 'Deposito',
        vinculacionTN: v.sku ? (v.sku + ' — ' + (v.tnVariantNombre || '')) : ''
      });
    }

  } else {
    // ── PRODUCTO SIMPLE (no catálogo, sin variantes) ──────────────────────
    // Con User Products activo, family_name es requerido incluso en productos simples.
    var payload = {
      title: datos.titulo,
      family_name: 'TT-' + Date.now(),
      category_id: datos.categoryId,
      currency_id: 'ARS',
      buying_mode: 'buy_it_now',
      listing_type_id: 'gold_special',
      condition: 'new',
      price: datos.precio,
      available_quantity: datos.stock || 0,
      description: { plain_text: (datos.descripcion || '').substring(0, 50000) },
      pictures: (datos.imagenes || []).slice(0, 12).map(function(u) { return { source: u }; }),
      shipping: baseShipping,
      attributes: catAttrs
    };
    if (datos.skuTN) payload.seller_custom_field = datos.skuTN;
    Logger.log('Publicando SIMPLE: ' + JSON.stringify(payload));

    var resultado = meliPost_('/items', payload);
    if (!resultado.id) throw new Error('MeLi no devolvio un ID de publicacion');

    primerResultado = resultado;
    resultadosVinc.push({
      success: true,
      itemId: resultado.id,
      titulo: datos.titulo,
      skuActual: datos.skuTN || '',
      skuNuevo: datos.skuTN || '',
      variante: '(Sin variante)',
      variacionId: '',
      stock: datos.stock || 0,
      precio: datos.precio || 0,
      tipo: 'Deposito',
      vinculacionTN: datos.skuTN ? (datos.skuTN + ' — (Sin variante)') : ''
    });
  }

  // Auto-vincular en hoja Vinculaciones
  try {
    actualizarHojaVinculaciones_(resultadosVinc);
  } catch (eVinc) {
    Logger.log('Error auto-vinculando post-publish: ' + eVinc.message);
  }

  var mlaId = primerResultado.id;
  return {
    success: true,
    mlaId: mlaId,
    mlaIds: resultadosVinc.map(function(r) { return r.itemId; }),
    variantesPublicadas: resultadosVinc.length,
    permalink: primerResultado.permalink || ('https://articulo.mercadolibre.com.ar/' + mlaId.replace('MLA', 'MLA-')),
    titulo: datos.titulo
  };
}

