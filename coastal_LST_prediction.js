// Define a coastal region in Zhejiang, China
var geometry = ee.Geometry.Polygon([
  [[120.75, 27.75],
   [122.25, 27.75],
   [122.25, 30.25],
   [120.75, 30.25]]
]);

Map.centerObject(geometry, 8);
Map.addLayer(geometry, {color: 'red'}, 'Coastal China');

/////////////////////////////////////////////////////

// Precipitation
var rain = precipitation.reduce(ee.Reducer.sum()).rename('rain').clip(geometry);

Map.addLayer(rain, {
  max: 0, min: 4000,
  palette: ['purple', 'blue', 'cyan', 'green', 'yellow', 'red']
}, 'Rain', false);

// Rainfall histogram
var histogramRain = ui.Chart.image.histogram({
  image: rain, 
  region: geometry, 
  scale: 100,
  maxBuckets: 100
}).setOptions({
  title: 'Rainfall Distribution in Coastal China',
  vAxis: {title: 'Frequency'},
  hAxis: {title: 'Rainfall (sum)'}
});
print(histogramRain);

/////////////////////////////////////////////////////

// LST as label
var lst = lst.reduce(ee.Reducer.mean())
  .multiply(0.02).add(-273.15)
  .rename('LST')
  .clip(geometry);

Map.addLayer(lst, {
  min: 0, max: 50,
  palette: ['purple', 'blue', 'cyan', 'green', 'yellow', 'red']
}, 'LST');

/////////////////////////////////////////////////////

// Population
var pop = pop.filterBounds(geometry)
  .sort('system:time_start', false)
  .first()
  .rename('pop')
  .clip(geometry);

Map.addLayer(pop, {
  min: 0, max: 100,
  palette: ['black', 'red', 'white']
}, 'Population', false);

// Population statistics
var stats = pop.reduceRegion({
  reducer: ee.Reducer.mean()
    .combine(ee.Reducer.min(), '', true)
    .combine(ee.Reducer.max(), '', true)
    .combine(ee.Reducer.stdDev(), '', true)
    .combine(ee.Reducer.count(), '', true),
  geometry: geometry,
  scale: 100,
  maxPixels: 1e9,
  bestEffort: true
});
print('Population Statistics:', stats);

/////////////////////////////////////////////////////

// Elevation
var elevation = nasadem.select('elevation').clip(geometry);

Map.addLayer(elevation, {
  min: 0, max: 3000,
  palette: ['green', 'yellow', 'red', 'white']
}, 'Elevation', false);

// Elevation histogram
var histogramElev = ui.Chart.image.histogram({
  image: elevation, 
  region: geometry, 
  scale: 100,
  maxBuckets: 50
}).setOptions({
  title: 'Elevation Distribution in Coastal China',
  vAxis: {title: 'Frequency'},
  hAxis: {title: 'Elevation (meters)'}
});
print(histogramElev);

/////////////////////////////////////////////////////

// Combine all predictors
var combined = ee.Image([rain, lst, pop, elevation]).updateMask(pop);

// Sample the combined dataset
var sample = combined.sample({
  numPixels: 10000,
  region: geometry,
  scale: 100,
  geometries: true
}).randomColumn();

Map.addLayer(sample, {}, 'Sample', false);

// Split into train and test
var train = sample.filter(ee.Filter.lte('random', 0.8));
var test = sample.filter(ee.Filter.gt('random', 0.8));

print('Train size:', train.size(), 'Test size:', test.size());

/////////////////////////////////////////////////////

// Train Random Forest Regression
var regression = ee.Classifier.smileRandomForest(50)
  .train(train, 'LST', ['rain', 'elevation', 'pop'])
  .setOutputMode('REGRESSION');

print('Regression RF', regression.explain());

// Predict LST over entire region
var predictionLST = combined.classify(regression, 'LST_Prediction');

Map.addLayer(predictionLST, {
  min: 0, max: 50,
  palette: ['purple', 'blue', 'cyan', 'green', 'yellow', 'red']
}, 'LST Prediction');

/////////////////////////////////////////////////////

// Evaluate prediction on test data
var testData = test.classify(regression, 'LST_Prediction').map(function(data){
  return data.set('line', data.get('LST'));
});

// Scatter chart: actual vs predicted LST
var chart = ui.Chart.feature.byFeature(testData, 'LST', ['line', 'LST_Prediction'])
  .setChartType('ScatterChart')
  .setOptions({
    dataOpacity: 0.3,
    title: 'LST Actual vs Prediction (Coastal China)',
    hAxis: { title: 'LST Actual' },
    vAxis: { title: 'LST Prediction' },
    trendlines: {
      1: {
        opacity: 0.3,
        type: 'linear',
        showR2: true,
        color: 'blue',
        visibleInLegend: true
      }
    }
  });
print(chart);

/////////////////////////////////////////////////////

// Calculate RMSE
var trainedClassified = train.classify(regression);

var squaredErrors = trainedClassified.map(function(feature) {
  var error = ee.Number(feature.get('LST')).subtract(feature.get('classification'));
  return feature.set('squaredError', error.pow(2));
});

var mse = squaredErrors.reduceColumns({
  reducer: ee.Reducer.mean(),
  selectors: ['squaredError']
}).get('mean');

var rmse = ee.Number(mse).sqrt();
print('Training RMSE:', rmse);

/////////////////////////////////////////////////////

// Calculate MAE
var absoluteErrors = trainedClassified.map(function(feature) {
  var error = ee.Number(feature.get('LST')).subtract(feature.get('classification')).abs();
  return feature.set('absoluteError', error);
});

var mae = absoluteErrors.reduceColumns({
  reducer: ee.Reducer.mean(),
  selectors: ['absoluteError']
}).get('mean');

print('Training MAE:', mae);

////////////////////////////
// Add satellite basemap layer
Map.setOptions('SATELLITE');

// Optional: Add a layer with transparency to highlight study region on satellite map
Map.addLayer(geometry, {color: 'white'}, 'Study Area Boundary (Overlay)', false);

// Center and zoom again if needed
Map.centerObject(geometry, 8);

// Optional: Add UI control to switch between base layers
// (You can manually switch with the "Layers" box on the GEE Map UI)

// Sentinel-2: True Color Composite (RGB)
var s2 = ee.ImageCollection("COPERNICUS/S2_SR")
  .filterBounds(geometry)
  .filterDate('2022-06-01', '2022-08-31') // You can change this date range
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10)) // Less than 10% cloud cover
  .median()
  .clip(geometry);

// Visualize Sentinel-2 true color image
Map.addLayer(s2, {
  bands: ['B4', 'B3', 'B2'], // Red, Green, Blue
  min: 0,
  max: 3000
}, 'Sentinel-2 True Color');

// MODIS Surface Reflectance (e.g., MOD09GA)
var modis = ee.ImageCollection("MODIS/061/MOD09GA")
  .filterBounds(geometry)
  .filterDate('2022-06-01', '2022-06-30')
  .median()
  .clip(geometry);

// Visualize MODIS RGB
Map.addLayer(modis, {
  bands: ['sur_refl_b01', 'sur_refl_b04', 'sur_refl_b03'], // Red, Green, Blue
  min: 0,
  max: 5000
}, 'MODIS RGB (MOD09GA)');

// Print summary statistics table
var variableStats = combined.reduceRegion({
  reducer: ee.Reducer.mean()
            .combine(ee.Reducer.min(), '', true)
            .combine(ee.Reducer.max(), '', true)
            .combine(ee.Reducer.stdDev(), '', true),
  geometry: geometry,
  scale: 100,
  maxPixels: 1e9,
  bestEffort: true
});
print('Descriptive Statistics (Rain, LST, Pop, Elevation)', variableStats);




