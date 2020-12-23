/*

Welcome to Earth Engine Mali classification script v 2.0!

(copy & pastable!)

The script is broken into several parts with comments along the way on what
can easily be changed/modified to meet various needs.  THIS ONE DOES BATCH PROCESSING.

What you need to bring along: 
  -  This particular script depends on importing assets
     of polygons outlining training data for each desired class. Currently, this 
     means a new asset for each class (so one for ag and non-ag) - this can be 
     modified. NAMES IN CODE: training_MC1, training_MC2
  -  You should also import validation polygons. This can be one polygon with a column
     containing unique values for each class (in this case; MC_ID which has 1 for ag and 
     2 for non-ag) NAME IN CODE: validation_poly
     

*/

var mc1 = ee.FeatureCollection('users/joshuanorha/P2_training_mc1');
var mc2 = ee.FeatureCollection('users/joshuanorha/P2_training_mc2');

var validation = ee.FeatureCollection('users/joshuanorha/P2_validation_poly');


/// ------------------------------ STEP 1 -------------------------------------//

// The first step is all about setting up your data. 
//Building the polygons you'll need and the correct datasets.

// ( i. ) Build and et up our geometries (including imported training polygons) 

var point = ee.Geometry.Point(-2.6008, 14.7077);// Area of Interest
var region = point.buffer(5e3);

var grid = ee.FeatureCollection('users/alexmerkovic/grid_select');
//Map.addLayer(grid, {color: 'black'}, "Large Area");

var total_area = ee.Geometry.Rectangle(-4.817895778349519, 16.214807952326144, 0.9059811747754809, 13.197299744033442);//46

//Map.addLayer(total_area, {}, 'Total Area');

// ---------------------------------------------- INDEPENDENT GRIDS ------------------------------------------------ //

// var grid1 = ee.Geometry.Rectangle(-3.6009, 15.0027, -2.9994, 14.405);//46
// var grid2= ee.Geometry.Rectangle(-3.59936,15.30024, -2.69797,14.69932);//47
// var grid3 = ee.Geometry.Rectangle(-4.2065, 15.0015,-3.605, 14.4037);//26
// var grid4 = ee.Geometry.Rectangle(-2.99601,15.30266, -2.40236,14.39886);//66-3
// var grid5 = ee.Geometry.Rectangle(-3.59936,14.40128, -3.00328,13.50474);//44-3
// var grid6 = ee.Geometry.Rectangle(-3.599,15.300, -3, 14.70);//47-56
// var grid7 = ee.Geometry.Rectangle(-3.59936,15.30024, -2.9999, 14.1001);//47-54
// var grid8 = ee.Geometry.Rectangle(-3.89990,15.30039, -3.6002, 14.6996);//37-36
// var grid9 = ee.Geometry.Rectangle(-4.20270,15.29782, -3.59936,14.99736);//27-37
// var grid10 = ee.Geometry.Rectangle(-4.20431,14.40144,-3.90194,14.09702);//24
// var grid11= ee.Geometry.Rectangle(-4.20431,14.40144,-3.60161,14.09702);//24-34
// var grid12 = ee.Geometry.Rectangle(-4.20202,14.70228,-3.60135,14.10161);//25-34
// var grid13 = ee.Geometry.Rectangle(-4.20270,15.29782,-3.5995, 14.7007);//27-36
// var grid14 = ee.Geometry.Rectangle(-4.20270,15.29782,-3.89990,14.70075);//27-26
// var grid15 = ee.Geometry.Rectangle(-4.2065, 15.0015,-3.59936,14.09597);//26-34
// var grid16 = ee.Geometry.Rectangle(-4.2065, 15.0015,-3.6015, 14.7023);//26-36
// var grid17 = ee.Geometry.Rectangle(-4.2065, 15.0015,-3.30128,14.10315);//26-44
// var grid18 = ee.Geometry.Rectangle(-4.20270,15.29782,-3.6023, 14.1036);//27-34
// var grid19= ee.Geometry.Rectangle(-4.20270,15.29782,-3.6034, 14.4005);//27-35
// var grid20 = ee.Geometry.Rectangle(-4.20270,15.29782, -3.89581,15.00823);//27
// var grid21 = ee.Geometry.Rectangle(-3.89990,15.30039, -3.59936,14.99736);//37
// var grid22 = ee.Geometry.Rectangle(-4.2065, 15.0015,-3.89990,14.70075);//26
// var grid23 = ee.Geometry.Rectangle(-4.20202,14.70228,-3.89990,14.39939);//25
// var grid24 = ee.Geometry.Rectangle(-3.89888,15.00108,-3.59956,14.70075);//36
// var grid25 = ee.Geometry.Rectangle(-3.89888,14.69972,-3.59956,14.40041);//35
// var grid26 = ee.Geometry.Rectangle(-3.90092,14.39939,-3.60135,14.10161);//34

// --------------------------------------------------------------------------------------------------------------//

// var grids_all = (grid1, grid2, grid3, grid4, grid5, grid6, grid7, grid8, grid9, grid10, grid11, grid12, 
//     grid13, grid14, grid15, grid17, grid18, grid19, grid20, grid21, grid22, grid23, grid24, grid25, grid26);

/// maybe maybe maybe?
// var grids = ee.FeatureCollection(
//   [ee.Feature(
//     ee.Geometry.Rectangle([-3.6009, 15.0027, -2.9994, 14.405]),
//     {
//       "system:index" : "0"
//     }),
//   ee.Feature(
//     ee.Geometry.Rectangle([-3.59936,15.30024, -2.69797,14.69932]),
//     {
//       "system:index" : "1"
//     }),
//   ee.Feature(
//     ee.Geometry.Rectangle([-4.2065, 15.0015,-3.605, 14.4037]),
//     {
//       "system:index" : "2"
//     }),
//   ee.Feature(
//     ee.Geometry.Rectangle([-2.99601,15.30266, -2.40236,14.39886]),
//     {
//       "system:index" : "3"
//     })]);


// print(grids);



/// or how about systematic splicing of an image?

var grids = ee.Image.random().multiply(10000000).toInt32()
    .reduceToVectors({
      reducer: ee.Reducer.countEvery(),
      geometry: total_area,
      geometryType: 'bb' ,
      eightConnected: false,
      scale: 50000,
      crs: 'EPSG:4326'
    });
Map.addLayer(grids, {}, "Grid_total");

var gridlist = grids.toList(grids.size());


// This will be the larger area of interest polygon (gridzone). It will be the bounds 
// for our classification and input datasets. If you increase its size, 
// you'll likely run into memory errors.... but maybe not!

// var gridzone = ee.Geometry.Rectangle(-3.072211845838513, 14.300982123952656, -2.108161552869763, 15.180169863948779);

// This is the conversion of our feature collection tables (imported assets)
// to their correct polygon feature type. (This works around that "Flatten" error)

var ag_training = mc1.geometry();

var nonag_training = mc2.geometry();

// Map.addLayer(ag_training, {color: 'orange'}, 'Ag training all');


// Map.addLayer(nonag_test, {color: 'blue'}, 'NonAg Training all');

// Display these geometries (uncomment if desired - good to double check they're correct)

// for (var i=0; i < grids.size().getInfo(); i+=1) {
//   Map.addLayer(grids.get(i), {}, 'Grid_'+ i);
// }

// Map.addLayer(grid1, {}, 'Grid 1');
// Map.addLayer(grid2, {}, 'Grid 1');

// Map.addLayer(ag_training, {}, ' ag training poly');
// Map.addLayer(nonag_training, {}, 'non-ag training poly');

// center to area of interest
Map.centerObject(region, 10);


// // ( ii. ) Create the 3 Period NDVI Images

// Surface Reflectance Images (looks like P1 has clouds in max image -- could try min or median?)
var p1_j_sr = ee.ImageCollection("COPERNICUS/S2_SR").filterDate('2019-06-15', '2019-08-01');
var p2_j_sr = ee.ImageCollection("COPERNICUS/S2_SR").filterDate('2019-08-01', '2019-09-01');
var p3_j_sr = ee.ImageCollection("COPERNICUS/S2_SR").filterDate('2019-09-01', '2019-10-01');

// // Get training Pixels

// var p1 = p1_j_sr.min();

// var pixel_count = p1.clip(ag_training);
// Map.addLayer(pixel_count);
// var pixels = pixel_count.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15,
//   geometry: training_MC1
// });

// var pixel_num = ee.Number(pixels)

// print(pixel_num)



// Cloud masking function -- could add if desired with .map(maskS2clouds)
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

var p1j_sfn = p1_j_sr.min();
var p2j_sfn = p2_j_sr.min();
var p3j_sfn = p3_j_sr.min();

// // Check out the imagery

var SR_VIS = {
  min: 100,
  max: 3000,
  bands: ['B4', 'B3', 'B2'],
};

// // True color, cloudless Surface Reflectance image (from P3)
// Adding this to the map can give you a good look at whats on the ground - good for double checking

Map.addLayer(p3j_sfn.clip(total_area), SR_VIS, 'True Color');


// for (var i=0; i<grids.size().getInfo(); i+=5) {
//   var reg = ee.Feature(gridlist.get(i)).geometry();
//   var img = p3j_sfn.clip(reg);
//   Map.addLayer(img, SR_VIS, 'TrueCol_' + i);
// }


// ---- Original Code setting up the original Composite --------- // 

// Set time variables
var t1 = 166; // 15Jun
var t2 = 213;// 1Aug
var t3 = 244; // 1Sep
var t4 = 274; //1Oct


// Create a function to download the collection for a year of interest
// ***** here is where you could add the cloud mask if you desired ***********
//   to do so just add a .map(maskS2clouds) after the .filterBounds() function

var sentinel2 = function(year) {
  var start = year+''+'-01-01';
  var end = year+''+'-12-31';
  return ee.ImageCollection('COPERNICUS/S2')
    .filterDate(start, end)
    .filterBounds(region);
};

// FUNCTION to create new bands to the collection
var GREEN_s = 'B3';
var RED_s = 'B4';
var NIR_s = 'B8';
var SWIR_s = 'B11';

var addIndices = function(image) {
  var ndvi = image.normalizedDifference([NIR_s, RED_s]);
  return image.addBands(ndvi.rename('NDVI'));
};

var s2019 = sentinel2(2019).map(addIndices);

// 3-PERIOD PRODUCT
// Visualize RGB from different max-NDVI values from three distinct periods of the year
var p1 = s2019.filter(ee.Filter.dayOfYear(t1, t2)).select('NDVI').max();
var p2 = s2019.filter(ee.Filter.dayOfYear(t2+1, t3)).select('NDVI').max();
var p3 = s2019.filter(ee.Filter.dayOfYear(t3+1, t4)).select('NDVI').max();

var orig_composite_wide = p1.addBands(p2).addBands(p3);
// var orig_composite_clip = orig_composite_wide.clip(gridzone);


// -------------- SR Applied NDVI Calculation ---------- // 
/* I like the readability of this method and it feels easier to manipulate or 
expand on than the built in .normalizedDifference function. */
//This one can be used on any Sentinel 2 imagery 

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

// SR NDVI
var p1j_ndvi = NDVI(p1j_sfn);
var p2j_ndvi = NDVI(p2j_sfn);
var p3j_ndvi = NDVI(p3j_sfn);


//-------------- Compile SR NDVI into composite image. ------------------- //

var p1_onlyNDVI = p1j_ndvi.select('NDVI'); //
var p2_onlyNDVI = p2j_ndvi.select('NDVI'); //
var p3_onlyNDVI = p3j_ndvi.select('NDVI'); //

var image_SR = p1_onlyNDVI.addBands(p2_onlyNDVI).addBands(p3_onlyNDVI); //

var NDVI_viz = {
  min: 0,
  max: 1
};

// Clip it
var SR_clipped = image_SR.clip(total_area);

//Map.addLayer(SR_clipped, NDVI_viz, 'SR Composite NDVI'); /// ---------------- Good to add to map



// ----------- Alex's notes and side code ---------- //
//These add the tile grid and site map as layers- not necessary

// //var grid = ee.FeatureCollection('users/alexmerkovic/grid_select');
// //Map.addLayer(grid)
// //Map.addLayer(gridzone)
// //Map.addLayer(sites)

// //if the code to generate the NDVI stack does not work: the image is stored as an asset here
// //var image =ee.Image('users/alexmerkovic/douentza_2019_east');




// ------------------------------ PART 2- Classification --------------------------------//


// training feature collection
var training_polys = ee.FeatureCollection([
  ee.Feature(ag_training, {'classo': 1}),
  ee.Feature(nonag_training, {'classo': 2})
  ]);

// Map.addLayer(training_polys, {}, 'Training Polygons');
// *********  Identify the NDVI bands. (Took out NDVI_1 which was calculated from P2 which had significant clouds)
//  ****** feel free to re-add NDVI_1 to this band listing -  might reduce accuracy
var bands = ['NDVI', 'NDVI_2'];

var classimg = training_polys
  .filter(ee.Filter.notNull(['classo']))
  .reduceToImage({
    properties: ['classo'],
    reducer: ee.Reducer.first()
});

var trains_o = SR_clipped.addBands(classimg.select('first')).clip(training_polys);
// Map.addLayer(trains, {}, 'Total Tra');

// Lets try it with the for loop

for (var i=0; i<grids.size().getInfo(); i+=1) {
  var reg = ee.Feature(gridlist.get(i)).geometry();
 // Map.addLayer(reg, {color: 'grey'}, 'Grid_' + i);
  // Set Up Composite
  var b_p1j_ndvi = NDVI(p1j_sfn.clip(reg));
  var b_p2j_ndvi = NDVI(p2j_sfn.clip(reg));
  var b_p3j_ndvi = NDVI(p3j_sfn.clip(reg));
  var b_p1_onlyNDVI = b_p1j_ndvi.select('NDVI'); //
  var b_p2_onlyNDVI = b_p2j_ndvi.select('NDVI'); //
  var b_p3_onlyNDVI = b_p3j_ndvi.select('NDVI'); //
  // <compoisite> // 
  var b_NDVI_image = b_p1_onlyNDVI.addBands(b_p2_onlyNDVI).addBands(b_p3_onlyNDVI); //

  //Map.addLayer(b_NDVI_image, NDVI_viz, 'NDVI_'  + i);

  // -------- Grab Training Data! ---------- // 
  var restrict_ag_train = mc1.filterBounds(reg);
  var restrict_nonag_train = mc2.filterBounds(reg);

  var b_ag_training = restrict_ag_train.geometry();
  var b_nonag_training = restrict_nonag_train.geometry();

  
  var b_training_polys = ee.FeatureCollection([
    ee.Feature(b_ag_training, {'classo': 1}),
    ee.Feature(b_nonag_training, {'classo': 2})
    ]);
  

  var b_classimg = b_training_polys
    .filter(ee.Filter.notNull(['classo']))
    .reduceToImage({
      properties: ['classo'],
      reducer: ee.Reducer.first()
  });
 
  Map.addLayer(b_classimg, {min: 1, max: 2, palette: ['teal', 'lightgrey']}, 'Classimg_' + i);
  
  var b_trains = b_NDVI_image.addBands(b_classimg.select('first')).clip(reg);

  //Map.addLayer(b_trains, {}, 'training_img_' + i);

  //Map.addLayer(b_training_polys, {color: 'black'}, 'Training Polygons' + i);

  var b_training_pixel_lim = b_trains.sample({
    numPixels: 30000,
    scale: 30,
    seed: 0,
    region: b_training_polys,
  });
  
  // --------- and finally, classifier --------// 
  
  var b_svm_classifier_01 = ee.Classifier.libsvm({
    kernelType: 'RBF',
    gamma: 0.5,
    cost: 10,
  });

  var b_classviz = {
    min: 1,
    max: 2,
    palette: ['teal', 'lightgrey'] 
  };
  
  var b_trained_svm_01 = b_svm_classifier_01.train(b_training_pixel_lim, 'first', bands);

  // and apply the classifier/display *fingers crossed*
  var b_svm_classified_01 = b_NDVI_image.classify(b_trained_svm_01);
  
  //Map.addLayer(b_svm_classified_01, b_classviz, 'Batch SVM' + i); // --------------------- Add to map to visualize SVM classification

}

// ---- old code ---- //
/*
// This classification focuses on the Support Vector Machine (SVM) classifier
// The SVM classifier creates pixel groups separated by hyperplanes (like 3-d lines) and 
// designates classes based on these groupings.


//old stuff
// var orig_input = orig_composite_clip.addBands(classimg.select('first')).clip(gridzone);

// // -------- Grab Training Data! ---------- // 

// var training_pixel_lim = SR_input.sample({
//   numPixels: 30000,
//   seed: 0,
//   scale: 20,
//   region: training_polys,
// });

//------------- SVM Classifier ---------------------// 

// var svm_classifier_01 = ee.Classifier.libsvm({
//   kernelType: 'RBF',
//   gamma: 0.5,
//   cost: 10,
// });

// var classviz = {
//   min: 1,
//   max: 2,
//   palette: ['teal', 'lightgrey'] 
// };

// var trained_svm_01 = svm_classifier_01.train(training_pixel_lim, 'first', bands);
// var svm_classified_01 = SR_clipped.classify(trained_svm_01);

// // Original Composite SVM
// var orig_svm_classified = orig_input.classify(trained_svm_01);

// // applying to entire region

// var sr_large = image_SR.clip(grid);

// var svm_large = sr_large.classify(trained_svm_01);



// Map.addLayer(svm_classified_01, classviz, 'Surface Reflectance SVM'); // --------------------- Add to map to visualize SVM classification
// Map.addLayer(svm_large, classviz, 'Largescale application of SVM'); // --------------------- Add to map to visualize SVM classification

//Map.addLayer(orig_svm_classified, classviz, 'Original Comp SVM'); // --------------------- Add to map to visualize SVM classification, could change colors if desired


//------------------------------- PART 3- ACCURACY ASSESSMENT -------------------------------//

// // Confusion matrix is a general accuracy assessment using other points in your training data against how they were classified
// var confMatrix = trained_svm_01.confusionMatrix();
// //var ndvi_confMatrix = ndvi_only_svm.confusionMatrix();

// // some more details
// var OA = confMatrix.accuracy();
// var CA = confMatrix.consumersAccuracy();
// var Kappa = confMatrix.kappa();
// var Order = confMatrix.order();
// var PA = confMatrix.producersAccuracy();

//------------------- Uncomment to see Confusion Matrix Results --------------------- //  
// print(confMatrix,'Confusion Matrix');
// print(OA,'Overall Accuracy');
// print(CA,'Consumers Accuracy');
// //print(Kappa,'Kappa');
// //print(Order,'Order');
// print(PA,'Producers Accuracy');


//------ More Accurate Validation-Input based assessment ------------ //

// var svm_clipped_to_val = svm_classified_01.clip(validation_poly);
// var orisvm_clipped_to_val = orig_svm_classified.clip(validation_poly);

// /* This will actually be a more extensive validation assessment than the .errorMatrix() or .confusionMatrix() 

// This process works by assigning uniqe values to each pixel within the validation polygons. 
// It does so by differencing the validation polygon pixel values and the classification values 
// within those polygons. 

// Potential Values:

// 3 = Ground Ag INCORRECTLY classified as Non-Ag (Purple)
 
// 2 = Ground Non-Ag CORRECTLY classified as Non-Ag (PINK)
 
// 1 = Ground Ag CORRECTLY classified as Ag (GREEN)
 
// 0 = Ground Non-Ag INCORRECTLY classified as Ag (RED)
 
// Pixel count assessment can give us the users and producers, as well as overall accuracy!

// */

// var classification_vals = svm_clipped_to_val.expression(
//   'classification_pix * 2',
//   {
//     'classification_pix': svm_clipped_to_val.select('classification')
//   });

// // The added _o will refer to the classification of the original composite
// var classification_vals_o = orisvm_clipped_to_val.expression(
//   'classification_pix * 2',
//   {
//     'classification_pix': orisvm_clipped_to_val.select('classification')
//   });


// // Set up and import validation polygons


// // Make sure to change 'MC_ID' to whatever the column label is for you classification values
// var val_image = validation_poly
//   .filter(ee.Filter.notNull(['MC_ID']))
//   .reduceToImage({
//     properties: ['MC_ID'],
//     reducer: ee.Reducer.first()
// });

// var val_compiled = classification_vals.addBands(val_image.select('first')); 
// var val_compiled_o = classification_vals_o.addBands(val_image.select('first')); 

// var validiff = val_compiled.expression(
//   'classification_pix - validation_pix', 
//     {
//     'classification_pix': val_compiled.select('classification'),
//     'validation_pix': val_compiled.select('first')
//   });

// var validiff_o = val_compiled_o.expression(
//   'classification_pix - validation_pix', 
//     {
//     'classification_pix': val_compiled_o.select('classification'),
//     'validation_pix': val_compiled_o.select('first')
//   });


// Map.addLayer(validiff, {min: 0, max: 3, palette: ['red', 'green', 'pink', 'Purple']}, 'Validation Pixel Diff'); 
// //Map.addLayer(validiff_o, {min: 0, max: 3, palette: ['red', 'green', 'pink', 'Purple']}, 'Validation Pixel Diff Original Comp'); 
// // ^^^^^  These two shows each of the color-coded classification scenarios! ^^^^^^^^^^^^^

// var ag_as_nonag = validiff.updateMask(validiff.eq(3)); // We'll call this pixel group 4
// var ag_as_nonag_o = validiff_o.updateMask(validiff_o.eq(3)); // We'll call this pixel group 4

// var nonag_as_nonag = validiff.updateMask(validiff.eq(2)); // pixel group 3
// var nonag_as_nonag_o = validiff_o.updateMask(validiff_o.eq(2)); // pixel group 3

// var ag_as_ag = validiff.updateMask(validiff.eq(1)); // pixel group 2
// var ag_as_ag_o = validiff_o.updateMask(validiff_o.eq(1)); // pixel group 2

// var nonag_as_ag = validiff.updateMask(validiff.eq(0)); // pixel group 1
// var nonag_as_ag_o = validiff_o.updateMask(validiff_o.eq(0)); // pixel group 1

// // Perform the reduction, print the result.
// var group_4_count = ag_as_nonag.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var group_4_num = ee.Number(group_4_count.get('classification'));

// var group_4_count_o = ag_as_nonag_o.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var group_4_num_o = ee.Number(group_4_count_o.get('classification'));


// var group_3_count = nonag_as_nonag.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var group_3_num = ee.Number(group_3_count.get('classification'));

// var group_3_count_o = nonag_as_nonag_o.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var group_3_num_o = ee.Number(group_3_count_o.get('classification'));

// var group_2_count = ag_as_ag.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var group_2_num = ee.Number(group_2_count.get('classification'));

// var group_2_count_o = ag_as_ag_o.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var group_2_num_o = ee.Number(group_2_count_o.get('classification'));

// var group_1_count = nonag_as_ag.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var group_1_num = ee.Number(group_1_count.get('classification'));

// var group_1_count_o = nonag_as_ag_o.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var group_1_num_o = ee.Number(group_1_count_o.get('classification'));


// var total_val_pixels = validiff.reduceRegion({
//   reducer: ee.Reducer.count(),
//   scale: 20,
//   maxPixels: 1e15
// });

// var total_val_num = ee.Number(total_val_pixels.get('classification'));

// print('Total Val polygon Pixels', total_val_num);

// var count_check = group_4_num.add(group_3_num).add(group_2_num).add(group_1_num);
// print('Total Pixel Check', count_check);

// // Big ol calculation test, hopefully it can go through -- Looks like it does! Woot Woot!
// // var total_acc = group_3_num.add(group_2_num).divide(total_val_num);
// // print('Overall Accuracy', total_acc);

// // var total_acc_o = group_3_num_o.add(group_2_num_o).divide(total_val_num);
// // print('Original Composite Overall Accuracy', total_acc_o);


// // var ag_producers = group_2_num.divide((group_2_num).add(group_4_num));
// // print("Agric. Producer's Accuracy", ag_producers);

// // // var ag_producers_o = group_2_num_o.divide((group_2_num_o).add(group_4_num_o));
// // // print("Original Composite Agric. Producer's Accuracy", ag_producers_o);


// // var nonag_producers = group_3_num.divide((group_3_num).add(group_1_num));
// // print("Non-Agric. Producer's Accuracy", nonag_producers);

// // // var nonag_producers_o = group_3_num_o.divide((group_3_num_o).add(group_1_num_o));
// // // print("Original Composite Non-Agric. Producer's Accuracy", nonag_producers_o);


// // var ag_consumers = group_2_num.divide((group_2_num).add(group_1_num));
// // print("Agric. Consumer's Accuracy", ag_consumers);

// // // var ag_consumers_o = group_2_num_o.divide((group_2_num_o).add(group_1_num_o));
// // print("Original Composite Agric. Consumer's Accuracy", ag_consumers_o);


// var nonag_consumers = group_3_num.divide((group_3_num).add(group_4_num));
// print("Non-Agric. Consumer's Accuracy", ag_consumers);

// // var nonag_consumers_o = group_3_num_o.divide((group_3_num_o).add(group_4_num_o));
// // print("Original Composite Non-Agric. Consumer's Accuracy", ag_consumers_o);



// ---------------------------------- ADDING AND DRAWING NEW TRAINING DATA ---------------------- //



//see whats already there
