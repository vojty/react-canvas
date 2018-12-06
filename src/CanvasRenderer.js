import React from "react";
import invariant from "fbjs/lib/invariant";
import emptyObject from "fbjs/lib/emptyObject";
import Gradient from "./Gradient";
import Text from "./Text";
import Group from "./Group";
import { RawImage } from "./Image";
import ReactDOMFrameScheduling from "./ReactDOMFrameScheduling";
import ReactFiberReconciler from "react-reconciler";
import CanvasComponent from "./CanvasComponent";
import { getClosestInstanceFromNode } from "./ReactDOMComponentTree";

const UPDATE_SIGNAL = {};
const MAX_POOLED_COMPONENTS_PER_TYPE = 1024;

const componentConstructors = {
  Gradient: Gradient,
  Text: Text,
  Group: Group,
  RawImage: RawImage
};

const componentPool = {};

const freeComponentToPool = component => {
  const type = component.type;

  if (!(component.type in componentPool)) {
    componentPool[type] = [];
  }

  const pool = componentPool[type];

  if (pool.length < MAX_POOLED_COMPONENTS_PER_TYPE) {
    pool.push(component);
  }
};

const freeComponentAndChildren = c => {
  if (!(c instanceof CanvasComponent)) return;

  const children = c.getLayer().children;

  for (let i = 0; i < children.length; i++) {
    const childLayer = children[i];
    freeComponentAndChildren(childLayer.component);
  }

  c.reset();
  freeComponentToPool(c);
};

const CanvasHostConfig = {
  appendInitialChild(parentInstance, child) {
    if (typeof child === "string") {
      // Noop for string children of Text (eg <Text>{'foo'}{'bar'}</Text>)
      invariant(false, "Text children should already be flattened.");
      return;
    }

    child.getLayer().inject(parentInstance.getLayer());
  },

  createInstance(type, props /*, internalInstanceHandle*/) {
    let instance;

    const pool = componentPool[type];

    if (pool && pool.length > 0) {
      instance = componentPool[type].pop();
    } else {
      instance = new componentConstructors[type](type);
    }

    if (typeof instance.applyLayerProps !== "undefined") {
      instance.applyLayerProps({}, props);
      instance.getLayer().invalidateLayout();
    }

    return instance;
  },

  createTextInstance(text /*, rootContainerInstance, internalInstanceHandle*/) {
    return text;
  },

  finalizeInitialChildren(/*domElement, type, props*/) {
    return false;
  },

  getPublicInstance(instance) {
    return instance;
  },

  prepareForCommit() {
    // Noop
  },

  prepareUpdate(/*domElement, type, oldProps, newProps*/) {
    return UPDATE_SIGNAL;
  },

  resetAfterCommit() {
    // Noop
  },

  resetTextContent(/*domElement*/) {
    // Noop
  },

  shouldDeprioritizeSubtree(/*type, props*/) {
    return false;
  },

  getRootHostContext() {
    return emptyObject;
  },

  getChildHostContext() {
    return emptyObject;
  },

  scheduleDeferredCallback: ReactDOMFrameScheduling.rIC,

  shouldSetTextContent(type, props) {
    return (
      typeof props.children === "string" || typeof props.children === "number"
    );
  },

  now: ReactDOMFrameScheduling.now,

  isPrimaryRenderer: false,

  useSyncScheduling: true,

  mutation: {
    appendChild(parentInstance, child) {
      const childLayer = child.getLayer();
      const parentLayer = parentInstance.getLayer();

      if (childLayer.parentLayer === parentLayer) {
        childLayer.moveToTop();
      } else {
        childLayer.inject(parentLayer);
      }

      parentLayer.invalidateLayout();
    },

    appendChildToContainer(parentInstance, child) {
      const childLayer = child.getLayer();
      const parentLayer = parentInstance.getLayer();

      if (childLayer.parentLayer === parentLayer) {
        childLayer.moveToTop();
      } else {
        childLayer.inject(parentLayer);
      }

      parentLayer.invalidateLayout();
    },

    insertBefore(parentInstance, child, beforeChild) {
      const parentLayer = parentInstance.getLayer();
      child.getLayer().injectBefore(parentLayer, beforeChild.getLayer());
      parentLayer.invalidateLayout();
    },

    insertInContainerBefore(parentInstance, child, beforeChild) {
      const parentLayer = parentInstance.getLayer();
      child.getLayer().injectBefore(parentLayer, beforeChild.getLayer());
      parentLayer.invalidateLayout();
    },

    removeChild(parentInstance, child) {
      const parentLayer = parentInstance.getLayer();
      child.getLayer().remove();
      freeComponentAndChildren(child);
      parentLayer.invalidateLayout();
    },

    removeChildFromContainer(parentInstance, child) {
      const parentLayer = parentInstance.getLayer();
      child.getLayer().remove();
      freeComponentAndChildren(child);
      parentLayer.invalidateLayout();
    },

    commitTextUpdate(/*textInstance, oldText, newText*/) {
      // Noop
    },

    commitMount(/*instance, type, newProps*/) {
      // Noop
    },

    commitUpdate(instance, updatePayload, type, oldProps, newProps) {
      if (typeof instance.applyLayerProps !== "undefined") {
        instance.applyLayerProps(oldProps, newProps);
        instance.getLayer().invalidateLayout();
      }
    }
  }
};

const CanvasRenderer = ReactFiberReconciler(CanvasHostConfig);

CanvasRenderer.injectIntoDevTools({
  findFiberByHostInstance: getClosestInstanceFromNode,
  bundleType: process.env.NODE_ENV !== "production" ? 1 : 0,
  version: React.version || 16,
  rendererPackageName: "react-canvas",
  getInspectorDataForViewTag: (...args) => {
    console.log(args); // eslint-disable-line no-console
  }
});

CanvasRenderer.registerComponentConstructor = (name, ctor) => {
  componentConstructors[name] = ctor;
};

export default CanvasRenderer;
