import React, { useEffect, useRef, useState } from "react";
import {
  RenderingEngine,
  Enums,
  Types,
  init as csRenderInit,
} from "@cornerstonejs/core";

import {
  init as csToolsInit,
  ToolGroupManager,
  addTool,
  StackScrollTool,
  WindowLevelTool,
  ZoomTool,
  Enums as csToolsEnums,
} from "@cornerstonejs/tools";

import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";
import './css/cornerstone.css';

function Cornerstone3DStackViewer({ imageIds }: { imageIds: string[] }) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const viewportRef = useRef<Types.IStackViewport | null>(null);
  const [currentSlice, setCurrentSlice] = useState(0);

  const toolGroupId = "MY_TOOLGROUP";
  const viewportId = "STACK_VIEWPORT";

  useEffect(() => {
    if (!elementRef.current || imageIds.length === 0) return;

    const initCornerstone = async () => {
      await csRenderInit();
      await csToolsInit();
      await dicomImageLoaderInit({
        beforeSend: (xhr) => {
          const token = localStorage.getItem("access_token");
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }
        },
      });

      // Sort imageIds if needed
// Suppose imageIds is your array of wadouri strings.
const sortedImageIds = imageIds.sort((a, b) => {
  // Regex to capture the digits between parentheses, e.g. Ankle (10).dcm
  const re = /Ankle \((\d+)\)\.dcm/i; 
  // Extract numeric parts
  const matchA = a.match(re);
  const matchB = b.match(re);

  // If either doesn't match, push it to the end or handle gracefully
  if (!matchA || !matchB) {
    return 0; 
  }

  const numA = parseInt(matchA[1], 10);
  const numB = parseInt(matchB[1], 10);

  return numA - numB;
});

console.log(sortedImageIds);


      // 3) Create a rendering engine
      const renderingEngine = new RenderingEngine("myEngine");
      renderingEngineRef.current = renderingEngine;



      // 4) Enable a STACK viewport
      renderingEngine.enableElement({
        viewportId,
        element: elementRef.current!,
        type: Enums.ViewportType.STACK,
      });

      // 5) Grab the viewport instance
      const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport;
      viewportRef.current = viewport;

      // 6) Load the stack (2D images)
      await viewport.setStack(sortedImageIds, 0); // Show first slice initially
      viewport.render();

      // 7) Create a ToolGroup
      const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

      // Add necessary tools
      addTool(StackScrollTool);
      addTool(ZoomTool);
      addTool(WindowLevelTool);

      if(!toolGroup)  return;

      // Add them to the tool group
      toolGroup.addTool(StackScrollTool.toolName);
      toolGroup.addTool(ZoomTool.toolName);
      toolGroup.addTool(WindowLevelTool.toolName);

      // Link the tool group to our viewport
      toolGroup.addViewport(viewportId, renderingEngine.id);

      // Optionally set default tool as WindowLevel or Scroll or Zoom, etc.
      toolGroup.setToolActive(WindowLevelTool.toolName, {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
      });

      // Because we sorted the imageIds, let's ensure our slider's max matches
      setCurrentSlice(0); // Ensure state aligns with the first index
    };

    initCornerstone();

    return () => {
      if (renderingEngineRef.current) {
        renderingEngineRef.current.disableElement(viewportId);
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }
    };
  }, [imageIds]);

  // Whenever currentSlice changes, update the displayed image index in the viewport
  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.setImageIdIndex(currentSlice);
    viewportRef.current.render();
  }, [currentSlice]);


  // We'll assume a typical stack has N images.
  const numImages = imageIds.length;
  const maxIndex = numImages - 1;

  return (
    <div style={{ display: "flex" }}>
      {/* Left side: Cornerstone viewport */}
      <div style={{ width: 600, height: 600, backgroundColor: "black" }}>
        <div
          ref={elementRef}
          style={{ width: "100%", height: "100%", position: "relative" }}
        />
      </div>

      {/* RIGHT PANEL */}
<div className="right-panel">
  {imageIds.length > 0 ? (
    <>
            <div className="slice-label">
          Slice: {currentSlice + 1}/{numImages}
        </div>
      {/* Slider container */}
      <div className="slider-container">
        <input
          type="range"
          className="vertical-slider"
          min={0}
          max={maxIndex}
          value={currentSlice}
          onChange={(e) => setCurrentSlice(Number(e.target.value))}
        />

      </div>
    </>
  ) : (
    <p>Please select a scan from the left panel.</p>
  )}
</div>
     </div>
  );
}

export default Cornerstone3DStackViewer;
