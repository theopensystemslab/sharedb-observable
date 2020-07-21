import randomWords from "random-words";
import { v4 as uuid } from "uuid";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { connectToDB, getConnection } from "./sharedb";
import { useTransition } from "./react-experimental";
import {
  Link,
  BrowserRouter as Router,
  useHistory,
  useLocation,
} from "react-router-dom";

interface Node {
  text: string;
}

type Flow = {
  nodes: Record<string, Node>;
  edges: Array<[string | null, string]>;
};

// Custom hook for talking to a flow in ShareDB
function useFlow(config: {
  id: string;
}): {
  state: Flow | null;
  addNode: () => void;
  removeNode: (id: string) => void;
  reset: (flow: Flow) => void;
  isPending: boolean;
} {
  // Setup

  const [startTransition, isPending] = useTransition();

  const [state, setState] = useState<Flow | null>(null);

  const doc = useMemo(() => getConnection(config.id), [config.id]);

  useEffect(() => {
    const cloneStateFromShareDB = () =>
      startTransition(() => {
        setState(JSON.parse(JSON.stringify(doc.data)));
      });

    connectToDB(doc).then(() => {
      cloneStateFromShareDB();
      doc.on("op", cloneStateFromShareDB);
    });

    return () => {
      setState(null);
      doc.destroy();
    };
  }, [doc, startTransition]);

  // Methods

  const addNode = useCallback(() => {
    doc.submitOp([{ p: ["nodes", uuid()], oi: { text: randomWords() } }]);
  }, [doc]);

  const removeNode = useCallback(
    (id) => {
      doc.submitOp([{ p: ["nodes", id], od: {} }]);
    },
    [doc]
  );

  const reset = useCallback(
    (flow) => {
      doc.submitOp([{ p: [], od: doc.data, oi: flow }]);
    },
    [doc]
  );

  // Public API

  return {
    state,
    addNode,
    removeNode,
    reset,
    isPending,
  };
}

const Flow: React.FC<{ id: string }> = ({ id }) => {
  const flow = useFlow({ id });

  if (flow.state === null) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <main>
        <button
          onClick={() => {
            flow.addNode();
          }}
        >
          Add
        </button>
        <button
          onClick={() => {
            fetch("/flow.json")
              .then((res) => res.json())
              .then((flowData) => {
                flow.reset(flowData);
              });
          }}
        >
          Import flow
        </button>
        <button
          onClick={() => {
            flow.reset({
              nodes: {},
              edges: [],
            });
          }}
        >
          Reset
        </button>
        {Object.keys(flow.state.nodes).map((k) => (
          <NodeView
            key={k}
            onRemove={flow.removeNode}
            id={k}
            node={flow.state.nodes[k]}
          />
        ))}
      </main>
      {flow.isPending && <div className="overlay" />}
    </>
  );
};

const NodeView = React.memo(
  ({
    id,
    node,
    onRemove,
  }: {
    id: string;
    node: Node;
    onRemove: (id: string) => void;
  }) => (
    <div className="node">
      <button
        className="remove-button"
        onClick={() => {
          onRemove(id);
        }}
      >
        ×
      </button>
      <p>
        {node.text || "unset"} {Math.round(Math.random() * 1000)}
      </p>
    </div>
  ),
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    prevProps.onRemove === nextProps.onRemove &&
    JSON.stringify(prevProps.node) === JSON.stringify(nextProps.node)
);

const SimpleLink = ({ to }: { to: string }) => {
  const location = useLocation();
  return (
    <Link to={to}>{location.hash === to ? <strong>{to}</strong> : to}</Link>
  );
};

const App = () => {
  const history = useHistory();
  const location = useLocation();

  const id = useMemo(() => {
    if (location.hash.length < 2) {
      return null;
    }
    return location.hash.slice(1);
  }, [location]);

  // If there is no ID readable from the hash, redirect to a freshly created one
  useEffect(() => {
    if (id === null) {
      history.push(`#${randomWords()}`);
    }
  }, [id, history]);

  if (id === null) {
    return <p>Redirecting...</p>;
  }

  return (
    <div>
      <nav>
        <SimpleLink to="#direct" />
        <SimpleLink to="#captain" />
        <button
          onClick={() => {
            history.push(`#${randomWords()}`);
          }}
        >
          New flow
        </button>
      </nav>
      <Flow id={id} />
    </div>
  );
};

const Container = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default Container;
