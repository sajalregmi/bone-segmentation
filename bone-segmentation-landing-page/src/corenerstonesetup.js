// cornerstoneSetup.js
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

// 1) Attach external libraries to cornerstone WADO image loader
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// 2) (Optional) Configure cornerstoneTools
cornerstoneTools.init({
  showSVGCursors: true,
});

// 3) Export your configured objects if needed
export {
  cornerstone,
  cornerstoneTools,
  cornerstoneWADOImageLoader,
};
