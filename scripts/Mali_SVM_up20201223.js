/* 

This is a comprehensive walk through of how SVMs are used and evaluated in the STAMP Mali project.

1.) Dataset developement and reasoning

2.) Graphical analysis of data

3.) Classification building

4.) Classification assessment

*/

// Center Map
Map.setCenter(-2.7956, 14.6695);

// Establish Areas of Interest

var sml_area = ee.Geometry.Rectangle([-3.524597278800883,14.997499319721067,-2.302368274894633,14.367819746453346]);
var lrg_area = ee.Geometry.Rectangle(-4.817895778349519, 16.214807952326144, 0.9059811747754809, 13.197299744033442); // Same basic region, from var
var val_area = ee.Geometry.Rectangle([-4.269993610615814, 15.32464992930939, -2.1990707590533143, 13.248699880474987]);

//Import Training areas

var agri_dr = ee.FeatureCollection('users/joshuanorha/agri_drawn_fn').geometry(); // agri training poly from asset
var nonagri_dr = ee.FeatureCollection('users/joshuanorha/nonagri_dr_fn').geometry(); // nonagri_training from asset


// --------------------- 1.) Sentinel-2 Datasets --------------------------------------- //

// 2019 Full year (for spectral time series analysis)
var timeseries_dataset = ee.ImageCollection("COPERNICUS/S2_SR").filterDate('2019-01-01', '2019-12-30');

// Three NDVI Time periods for composite (provided by Alex)
var p1 = ee.ImageCollection("COPERNICUS/S2_SR").filterDate('2019-06-15', '2019-08-01').min();
var p2 = ee.ImageCollection("COPERNICUS/S2_SR").filterDate('2019-08-01', '2019-09-01').min();
var p3 = ee.ImageCollection("COPERNICUS/S2_SR").filterDate('2019-09-01', '2019-10-01').min();


// Cloud masking function -- could add if desired with .map(maskS2clouds) - For ImageCollection
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}


// Check out the imagery in true color surface reflectance

var SR_VIS = {
  min: 100,
  max: 3000,
  bands: ['B4', 'B3', 'B2'],
};

// // True color, cloudless Surface Reflectance image (from P3)
// Adding this to the map can give you a good look at whats on the ground - good for double checking

// Map.addLayer(p1.clip(lrg_area), SR_VIS, 'True Color, P1');
// Map.addLayer(p2.clip(lrg_area), SR_VIS, 'True Color, P2');
Map.addLayer(p3.clip(lrg_area), SR_VIS, 'True Color, P3');



// -------------- Set up Dataset Indeces ---------------- // 
/* I like the readability of this method and it feels easier to manipulate or 
// expand on than the built in .normalizedDifference function. */

var NDVI = function(image)
{
  var NDVI = image.expression(
    '(NIR - RED) / (NIR + RED)', 
    {
      'NIR': image.select('B8'),
      'RED': image.select('B4')
    });
    
image = image.addBands(NDVI.rename('NDVI')); 
    
return image;
};

// ---------------------------------- Tasseled Cap ------------------------------ //
/* 
Tasseled Cap is a series of orthagonal transforms applied to each band of a satellite sensor
These transforms are coefficients that are multiplied against the pixel values of each band, producing some value reflecting the 
relative wetness, greenness or brightness.

These tasseled cap transforms are more descriptive of the landscape than indices like NDVI and SAVI as they involve the 
landscape characteristics of every band, and exaggerate the important signatures of the data.
*/

var TCAP = function(image)
{
  var brightness = image.expression(
    '((B1 * 0.0356) + (B2 * 0.0822) + (B3 * 0.1360) + (B4 * 0.2611) + (B5 * 0.2964) + (B6 * 0.3338) + (B7 * 0.3877) + (B8 * 0.3895) + (B9 * 0.0949) + (B11 * 0.3882) + (B12 * 0.1366) + (B8A * 0.4750) ) / 12000', 
    {
      'B1': image.select('B1'),
      'B2': image.select('B2'),
      'B3': image.select('B3'),
      'B4': image.select('B4'),
      'B5': image.select('B5'),
      'B6': image.select('B6'),
      'B7': image.select('B7'),
      'B8': image.select('B8'),
      'B8A': image.select('B8A'),
      'B9': image.select('B9'),
      'B11': image.select('B11'),
      'B12': image.select('B12'),
    });

image = image.addBands(brightness.rename('brightness'));

  var greenness = image.expression(
    '((B1 * -0.0635) + (B2 * -0.1128) + (B3 * -0.1680) + (B4 * -0.3480) + (B5 * -0.3303) + (B6 * 0.0852) + (B7 * 0.3302) + (B8 * 0.3165) + (B9 * 0.0467) + (B11 * -0.4578) + (B12 * -0.4064) + (B8A * 0.3625) ) / 3000', 
    {
      'B1': image.select('B1'),
      'B2': image.select('B2'),
      'B3': image.select('B3'),
      'B4': image.select('B4'),
      'B5': image.select('B5'),
      'B6': image.select('B6'),
      'B7': image.select('B7'),
      'B8': image.select('B8'),
      'B8A': image.select('B8A'),
      'B9': image.select('B9'),
      'B11': image.select('B11'),
      'B12': image.select('B12'),
    });

image = image.addBands(greenness.rename('greenness'));

  var wetness = image.expression(
    '( (B1 * 0.0649) + (B2 * 0.1363) + (B3 * 0.2802) + (B4 * 0.3072) + (B5 * 0.5288) + (B6 * 0.1379) + (B7 * -0.0001) + (B8 * -0.0807) + (B9 * -0.0302) + (B11 * -0.4064) + (B12 * -0.5602) + (B8A * -0.1389) ) / 2000', 
    {
      'B1': image.select('B1'),
      'B2': image.select('B2'),
      'B3': image.select('B3'),
      'B4': image.select('B4'),
      'B5': image.select('B5'),
      'B6': image.select('B6'),
      'B7': image.select('B7'),
      'B8': image.select('B8'),
      'B8A': image.select('B8A'),
      'B9': image.select('B9'),
      'B11': image.select('B11'),
      'B12': image.select('B12'),
    });

image = image.addBands(wetness.rename('wetness'));

return image;
};


// --------------------- SAVI ------------------- //
/* SAVI is the Soil Adjusted Vegetation Index, it is often a more accurate descriptor of the ground signatures when 
there is large amounts of exposed soil. Exposed soil gives off high reflectance values accross all bands (doesn't absorb
much light). This index helps to exaggerate the differences between vegetative light absorbance, and soild reflectance. */


var SAVI = function(img)
{
var SAVI = img.expression(
  "((NIR - RED)/(NIR + RED + (0.5))) * (1.5)",
  {
    'NIR': img.select('B8'),
    'RED': img.select('B4')
  });
  
img = img.addBands(SAVI.rename('SAVI')); 
    
return img;
};

// ------------ Apply the index functions to the datasets ------------------ //

// SR NDVI
var p1j_ndvi = NDVI(p1);
var p2j_ndvi = NDVI(p2);
var p3j_ndvi = NDVI(p3);


// SR TC 
var p1_ndvi_tc = TCAP(p1j_ndvi);
var p2_ndvi_tc = TCAP(p2j_ndvi);
var p3_ndvi_tc = TCAP(p3j_ndvi);


// SR SAVI 
var p1_allind = SAVI(p1_ndvi_tc);
var p2_allind = SAVI(p2_ndvi_tc);
var p3_allind = SAVI(p3_ndvi_tc);


var p1_comp = p1_allind.select('NDVI', 'brightness', 'greenness', 'wetness', 'SAVI'); //
var p2_comp = p2_allind.select('NDVI', 'brightness', 'greenness', 'wetness', 'SAVI'); //
var p3_comp = p3_allind.select('NDVI', 'brightness', 'greenness', 'wetness', 'SAVI'); //


// //-------------- Compile SR NDVI into composite image. ------------------- //

var allind_comp = p1_comp.addBands(p2_comp).addBands(p3_comp); //

var NDVI_viz = {
  min: 0.04,
  max: 0.8,
  bands: ['NDVI', 'NDVI_1', 'NDVI_2']
};

// Clip it
var all_ind_SR_lrg = allind_comp.clip(lrg_area);

var SAVI_viz = {
  min: 0.04,
  max: 1.529,
  bands: ['SAVI', 'SAVI_1', 'SAVI_2'],
};

var greenness_viz = {
  min: -0.04,
  max: 0.589,
  bands: ['greenness', 'greenness_1', 'greenness_2'],
};

var wetness_viz = {
  min: -0.629,
  max: 0.6018,
  bands: ['wetness', 'wetness_1', 'wetness_2'],
};


// Display a bunch of different datasets to visually compare TimeScan data
/* This is the layer that you can toggle between each of the different composites. If you want to 
view the wetness composite, go into the layer settings and change the bands to wetness_2, wetness_1, 
and wetness -- same for any other index */

Map.addLayer(all_ind_SR_lrg, NDVI_viz, 'NDVI TimeScan'); /// ---------------- Good to add to map

// Map.addLayer(all_ind_SR_lrg, SAVI_viz, 'SAVI TimeScan'); /// ---------------- Good to add to map

// Map.addLayer(all_ind_SR_lrg, greenness_viz, 'Greenness TimeScan'); /// ---------------- Good to add to map

// Map.addLayer(all_ind_SR_lrg, wetness_viz, 'Wetness TimeScan'); /// ---------------- Good to add to map


// // ------------------- EXPLORE ROI SPECTRAL TIME SERIES SIGNATURES --------------------------------------- // //

// here we set out our Regions of Interest (ROI's) and create annual charts to compare their spectral signatures

// First, try and find some time of year where there is a spectral difference between these similar landcover types (plains and dry ag)

// Map (Apply) index functions
var timeseries_ndvi = timeseries_dataset.map(NDVI);
var timeseries_tc_n = timeseries_ndvi.map(TCAP);
var timeseries_allind = timeseries_tc_n.map(SAVI);



var comp_bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A'];
var comp_ind = ['SAVI', 'NDVI', 'wetness', 'brightness', 'greenness'];
//var fin_comp = {''

// Create Time Series Spectral Charts for Comparison
// First chart is annual Non-Ag, second annual Ag reflectance accross all bands. Adjust the .select parameter to select for specific bands
// print(ui.Chart.image.series(timeseries_allind.select(comp_bands), nonag_exmp, ee.Reducer.mean(), 10).setOptions({title: 'Non-Ag Reflectance'}));
// print(ui.Chart.image.series(timeseries_allind.select(comp_bands), ag_exmp, ee.Reducer.mean(), 10).setOptions({title: 'Ag Reflectance'}));

//Second set of charts is annual Non-ag, and annual Ag reflectance across all calculated indeces.
// print(ui.Chart.image.series(timeseries_allind.select(comp_ind), nonag_exmp, ee.Reducer.mean(), 10).setOptions({title: 'Non-Ag Indices'}));
// print(ui.Chart.image.series(timeseries_allind.select(comp_ind), ag_exmp, ee.Reducer.mean(), 10).setOptions({title: 'Ag Indices'}));


var geo_col = ee.FeatureCollection([
  ee.Feature(nonagri_dr, {label: 'Non-Ag'}),
  ee.Feature(agri_dr, {label: 'Ag'})
  ]);

// var class_geos = ee.FeatureCollection([
//   ee.Feature(nonag_dry, {label: 'Non-Ag Dry'}),
//   ee.Feature(nonag_veg, {label: 'Non-Ag Veg'}),
//   ee.Feature(nonag_village, {label: 'Non-Ag Village'}),
//   ee.Feature(ag_dry, {label: 'Dry Ag'}),
//   ee.Feature(ag_midveg, {label: 'Med. Veg Ag'}),
//   ee.Feature(ag_highveg, {label: 'High Veg Ag'})

//   ]);


var tempTimeSeries = ui.Chart.image.seriesByRegion(
    timeseries_allind.filterDate('2019-05-01', '2020-01-01'), geo_col, ee.Reducer.mean(), 'NDVI', 100, 'system:time_start', 'label')
    .setChartType('LineChart')
    .setOptions({
      title: 'Regional NDVI Comparison', 
      lineWidth: 2,
      pointSize: 4,
      series: {
        0: {color: 'AFAFAF'}, // Non-Ag
        1: {color: 'B51400'} // Ag
        
      }});



//Pixel value graph for grouping
// var result = timeseries_allind.filterDate('2019-08-20', '2019-08-30').mean().reduceRegion(ee.Reducer.toList(), gen_geo, 120);

// var y1 = ee.Array(result.get('NDVI'));
// var y2 = ee.Array(result.get('SAVI'));

// var yValues = ee.Array.cat([y1, y2], 1);

// var xValues = result.get('brightness');

// var class_group_chart = ui.Chart.array.values(yValues, 0, xValues)
//     .setSeriesNames(['NDVI', 'SAVI'])
//     .setOptions({
//       title: 'Brightness vs. {NDVI, SAVI}',
//       hAxis: {'title': 'Brightness'},
//       vAxis: {'title': '{NDVI,SAVI}'},
//       pointSize: 3,
// });

// Here's where you can uncomment the charts to view the spectral changes over the year
print(tempTimeSeries);
//print(class_group_chart);



// // ------------------------------ PART 3 - Classification --------------------------------//

var bands = ['NDVI', 'SAVI', 'NDVI_1', 'SAVI_1', 'NDVI_2', 'SAVI_2']; //, 'greenness', 'brightness', 'brightness_1', 'greenness_1',  'brightness_2', 'greenness_2'];

// things you could add: 'greenness', 'brightness', 'brightness_1', 'greenness_1',  'brightness_2', 'greenness_2',

// training feature collection
var training_polys = ee.FeatureCollection([
  ee.Feature(agri_dr, {'classo': 1}),
  ee.Feature(nonagri_dr, {'classo': 2})
  ]);
  
  
// sample ALL the training data, not just random points:
var training = all_ind_SR_lrg.sampleRegions({
  collection: training_polys,
  properties: ['classo'],
  scale: 40,
  tileScale: 6
});


// Train Classifier 
var svm_classifier_lrg = ee.Classifier.libsvm({
    kernelType: 'RBF',
    gamma: 0.5,
    cost: 10
});

var b_classviz = {
    min: 1,
    max: 2,
    palette: ['teal', 'lightgrey'] 
  };
  
var trained_svm_lrg = svm_classifier_lrg.train(training, 'classo', bands);

var classified = all_ind_SR_lrg.classify(trained_svm_lrg);

var kernel = ee.Kernel.circle({radius: 1});
var svm_focused = classified.focal_mode({kernel: kernel, iterations: 2});


// Here is the full svm classification dataset 

// Map.addLayer(svm_focused, b_classviz, 'Classified');

// Mask to only show Ag Class
var ag_mask = svm_focused.eq(1);
var just_ag = svm_focused.updateMask(ag_mask);
var just_ag_val = just_ag.clip(val_area);

var nonag_mask = svm_focused.eq(2);
var just_nonag = svm_focused.updateMask(nonag_mask);
var just_nonag_val = just_nonag.clip(val_area);


Map.addLayer(just_ag, {palette: '#BAFA56'}, 'Ag Class');




// //------------------------------- PART 3- ACCURACY ASSESSMENT -------------------------------//

// build a bunch of random points

// var bufferPoly = function(feature) {
//   return feature.buffer(5);   // substitute in your value of Z here
// };

// var buffered_ag = ag_val_drawn.map(bufferPoly);
// var buffered_nonag = nonag_val_drawn.map(bufferPoly);


// buffered polys check
//Map.addLayer(buffered_ag, {palette: ['blue']}, 'Val Ag Polys');  

var validation_poly_2 = ee.FeatureCollection('users/joshuanorha/P2_validation_poly'); // validation from asset


// var ag_val_image1 = ee.Image(1).clip(buffered_ag);
// var nonag_val_image2 = ee.Image(2).clip(buffered_nonag);



// var val_points = ee.FeatureCollection([
//   ee.Feature(buffered_ag, {'classo': 1}),
//   ee.Feature(buffered_nonag, {'classo': 2})
//   ]);
  


//------ Accurate Validation-Input based assessment ------------ //



//var svm_clipped_to_val = classified.clip(val_points);

/* This will actually be a more extensive validation assessment than the .errorMatrix() or .confusionMatrix() 

This process works by assigning uniqe values to each pixel within the validation polygons. 
It does so by differencing the validation polygon pixel values and the classification values 
within those polygons. 

Potential Values:

3 = Ground Ag INCORRECTLY classified as Non-Ag (Purple)
 
2 = Ground Non-Ag CORRECTLY classified as Non-Ag (PINK)
 
1 = Ground Ag CORRECTLY classified as Ag (GREEN)
 
0 = Ground Non-Ag INCORRECTLY classified as Ag (RED)
 
Pixel count assessment can give us the users and producers, as well as overall accuracy!

*/

var classification_vals = svm_focused.expression(
  'classification_pix * 2',
  {
    'classification_pix': svm_focused.select('classification')
  });


// Set up and import validation polygons


// Make sure to change 'MC_ID' to whatever the column label is for you classification values
var val_image_poly = validation_poly_2
  .filter(ee.Filter.notNull(['MC_ID']))
  .reduceToImage({
    properties: ['MC_ID'],
    reducer: ee.Reducer.first()
});

// Create a vector representation of Classification

var svm_vect = just_ag_val.addBands(just_nonag_val).reduceToVectors({
  scale: 30,
  geometryType: 'polygon',
  labelProperty: 'class',
  reducer: ee.Reducer.mean(),
  maxPixels: 1e15
});


var svm_err = validation_poly_2.merge(svm_vect);


// Map.addLayer(svm_vect, {}, 'SVM Vectors');

// var val_image = val_points
//   .reduceToImage({
//     properties: ['classo'],
//     reducer: ee.Reducer.first()
// });


var val_comp_er = svm_focused.addBands(val_image_poly.select('first')); 

var val_compiled = classification_vals.addBands(val_image_poly.select('first')).clip(val_area); 

//var val_classified = val_points.addBands(classified.select('classification'));


// // Error matrix test
var testAccuracy = svm_err.errorMatrix('MC_ID', 'class');
print('Validation error matrix: ', testAccuracy);
print('Validation overall accuracy: ', testAccuracy.accuracy());


var validiff = val_compiled.expression(
  'classification_pix - validation_pix', 
    {
    'classification_pix': classification_vals.clip(val_area),
    'validation_pix': val_compiled.select('first')
  });


Map.addLayer(validiff, {min: 0, max: 3, palette: ['red', 'green', 'pink', 'Purple']}, 'Validation Pixel Diff'); 
//Map.addLayer(validiff_o, {min: 0, max: 3, palette: ['red', 'green', 'pink', 'Purple']}, 'Validation Pixel Diff Original Comp'); 
// ^^^^^  These two shows each of the color-coded classification scenarios! ^^^^^^^^^^^^^

var ag_as_nonag = validiff.updateMask(validiff.eq(3)); // We'll call this pixel group 4

var nonag_as_nonag = validiff.updateMask(validiff.eq(2)); // pixel group 3

var ag_as_ag = validiff.updateMask(validiff.eq(1)); // pixel group 2

var nonag_as_ag = validiff.updateMask(validiff.eq(0)); // pixel group 1

// Perform the reduction, print the result.
var group_4_count = ag_as_nonag.reduceRegion({
  reducer: ee.Reducer.count(),
  scale: 40,
  maxPixels: 1e15
});

var group_4_num = ee.Number(group_4_count.get('classification'));


var group_3_count = nonag_as_nonag.reduceRegion({
  reducer: ee.Reducer.count(),
  scale: 40,
  maxPixels: 1e15
});

var group_3_num = ee.Number(group_3_count.get('classification'));

var group_2_count = ag_as_ag.reduceRegion({
  reducer: ee.Reducer.count(),
  scale: 40,
  maxPixels: 1e15
});

var group_2_num = ee.Number(group_2_count.get('classification'));

var group_1_count = nonag_as_ag.reduceRegion({
  reducer: ee.Reducer.count(),
  scale: 40,
  maxPixels: 1e15
});

var group_1_num = ee.Number(group_1_count.get('classification'));


var total_val_pixels = validiff.reduceRegion({
  reducer: ee.Reducer.count(),
  scale: 40,
  maxPixels: 1e15
});

var total_val_num = ee.Number(total_val_pixels.get('classification'));

// print('Total Val polygon Pixels', total_val_num);

var count_check = group_4_num.add(group_3_num).add(group_2_num).add(group_1_num);
// print('Total Pixel Check', count_check);

// Big ol calculation test, hopefully it can go through -- Looks like it does! Woot Woot!


// var ag_producers = group_2_num.divide((group_2_num).add(group_4_num));
// print("Agric. Producer's Accuracy", ag_producers);


// var nonag_producers = group_3_num.divide((group_3_num).add(group_1_num));
// print("Non-Agric. Producer's Accuracy", nonag_producers);


// var ag_consumers = group_2_num.divide((group_2_num).add(group_1_num));
// print("Agric. Consumer's Accuracy", ag_consumers);


// var nonag_consumers = group_3_num.divide((group_3_num).add(group_4_num));
// print("Non-Agric. Consumer's Accuracy", nonag_consumers);

var total_acc = group_3_num.add(group_2_num).divide(total_val_num);
print('Overall Accuracy', total_acc);

// Map.addLayer(validation_poly_2, {palette:['green', 'red']}, 'Validation Polygons');





















// ----------------------------- EXPORTING DATA ------------------------- //

// Export.image.toDrive({
//   image: svm_focused,
//   description: 'imageToDriveExample',
//   scale: 20,
//   region: lrg_area,
//   maxPixels: 1e13
// });

// var nonag_exp = ee.FeatureCollection([nonagri_dr]);

// Export.table.toAsset({
//   collection: nonag_exp,
//   description: 'agvalToAssetExample',
//   assetId: 'ag_trn_drawn'
// });

// Export.table.toAsset({
//   collection: nonagri_dr,
//   description: 'nonagvalToAssetExample',
//   assetId: 'nonag_trn_drawn'
// });




