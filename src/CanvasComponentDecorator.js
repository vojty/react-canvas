import React from "react";
import RenderLayer from "./RenderLayer";
import { make } from "./FrameUtils";
import * as EventTypes from "./EventTypes";

export default function apply(Class) {
  let LAYER_GUID = 0;

  return class extends React.Component {
    displayName = "CanvasComponent";

    constructor(props) {
      super(props);

      this.subscriptions = null;
      this.listeners = null;
      this.node = new RenderLayer();
      this._currentElement = null;
      this._layerId = LAYER_GUID++;
    }

    construct = element => {
      this._currentElement = element;
    };

    getPublicInstance = () => {
      return this.node;
    };

    putEventListener = (type, listener) => {
      const subscriptions = this.subscriptions || (this.subscriptions = {});
      const listeners = this.listeners || (this.listeners = {});
      listeners[type] = listener;
      if (listener) {
        if (!subscriptions[type]) {
          subscriptions[type] = this.node.subscribe(type, listener, this);
        }
      } else {
        if (subscriptions[type]) {
          subscriptions[type]();
          delete subscriptions[type];
        }
      }
    };

    handleEvent = () => {
      // TODO
    };

    destroyEventListeners = () => {
      // TODO
    };

    applyCommonLayerProps = (prevProps, props) => {
      const layer = this.node;
      const style = props && props.style ? props.style : {};
      layer._originalStyle = style;

      // Common layer properties
      layer.alpha = style.alpha;
      layer.backgroundColor = style.backgroundColor;
      layer.borderColor = style.borderColor;
      layer.borderWidth = style.borderWidth;
      layer.borderRadius = style.borderRadius;
      layer.clipRect = style.clipRect;
      layer.frame = make(
        style.left || 0,
        style.top || 0,
        style.width || 0,
        style.height || 0
      );
      layer.scale = style.scale;
      layer.translateX = style.translateX;
      layer.translateY = style.translateY;
      layer.zIndex = style.zIndex;

      // Shadow
      layer.shadowColor = style.shadowColor;
      layer.shadowBlur = style.shadowBlur;
      layer.shadowOffsetX = style.shadowOffsetX;
      layer.shadowOffsetY = style.shadowOffsetY;

      // Generate backing store ID as needed.
      if (props.useBackingStore) {
        layer.backingStoreId = this._layerId;
      }

      // Register events
      for (const type in EventTypes) {
        this.putEventListener(EventTypes[type], props[type]);
      }
    };

    mountComponentIntoNode = () => {
      throw new Error(
        "You cannot render a Canvas component standalone. " +
          "You need to wrap it in a Surface."
      );
    };

    unmountComponent = () => {
      this.destroyEventListeners();
    };

    getLayer = () => this.node;

    render() {
      return <Class {...this.props} />;
    }
  };
}