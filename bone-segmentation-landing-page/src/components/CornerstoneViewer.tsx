import React, { useEffect, useRef } from "react";
import {
  RenderingEngine,
  Enums,
  type Types,
} from "@cornerstonejs/core";
import { init as csRenderInit } from "@cornerstonejs/core";
import { init as csToolsInit, StackScrollTool, ToolGroupManager } from "@cornerstonejs/tools";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";

function Cornerstone3DStackViewer({ imageIds }: { imageIds: string[] }) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);

  useEffect(() => {
    if (!elementRef.current || imageIds.length === 0) return;

    const init = async () => {
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

      // Create the rendering engine
      const renderingEngine = new RenderingEngine("myEngine");
      renderingEngineRef.current = renderingEngine;

      if (!elementRef.current) {
        console.error("Element not found");
        return;
      }

      const viewportId = "STACK_VIEWPORT";

      // Enable a stack viewport (2D slice scrolling)
      renderingEngine.enableElement({
        viewportId,
        element: elementRef.current,
        type: Enums.ViewportType.STACK,
      });

      // Create and configure a tool group
      const toolGroup = ToolGroupManager.createToolGroup("MY_TOOLGROUP");
      if (!toolGroup) {
        console.error("Failed to create tool group");
        return;
      }

      toolGroup.addTool(StackScrollTool.toolName);
      toolGroup.setToolActive(StackScrollTool.toolName, {
        bindings: [{ mouseButton: 1 }],
      });

      toolGroup.addViewport(viewportId, "myEngine");

      console.log("imageIds", imageIds);

      // Retrieve the viewport (cast to IStackViewport) and set the stack state
      const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport;
      await viewport.setStack(imageIds, 28);

      // Render the viewport
      viewport.render();
    };

    init();

    return () => {
      if (renderingEngineRef.current) {
        renderingEngineRef.current.disableElement("STACK_VIEWPORT");
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }
    };
  }, [imageIds]);

  return (
    <div
      ref={elementRef}
      style={{ width: 512, height: 512, backgroundColor: "black" }}
    />
  );
}

export default Cornerstone3DStackViewer;
