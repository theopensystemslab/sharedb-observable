import randomWords from "random-words";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { connectToDB, getConnection } from "./sharedb";
import { useTransition } from "./react-experimental";
import {
  Flow,
  Node,
  insertNodeOp,
  removeNodeOp,
  setFlowOp,
  connectOp,
} from "./flow";
import {
  Link,
  BrowserRouter as Router,
  useHistory,
  useLocation,
} from "react-router-dom";

// Custom hook for talking to a flow in ShareDB
function useFlow(config: {
  id: string;
}): {
  state: Flow | null;
  insertNode: () => void;
  removeNode: (id: string) => void;
  connectNodes: (src: string, tgt: string) => void;
  setFlow: (flow: Flow) => void;
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

  const insertNode = useCallback(() => {
    doc.submitOp(insertNodeOp());
  }, [doc]);

  const removeNode = useCallback(
    (id) => {
      doc.submitOp(removeNodeOp(id, doc.data));
    },
    [doc]
  );

  const connectNodes = useCallback(
    (src, tgt) => {
      doc.submitOp(connectOp(src, tgt, doc.data));
    },
    [doc]
  );

  const setFlow = useCallback(
    (flow) => {
      doc.submitOp(setFlowOp(flow, doc.data));
    },
    [doc]
  );

  // Public API

  return {
    state,
    insertNode,
    removeNode,
    setFlow,
    connectNodes,
    isPending,
  };
}

const FlowView: React.FC<{ id: string }> = ({ id }) => {
  const flow = useFlow({ id });

  const [selected, setSelected] = useState<string | null>(null);

  const onSelect = useCallback(
    (id: string) => {
      if (selected === null) {
        setSelected(id);
      } else if (selected === id) {
        setSelected(null);
      } else {
        flow.connectNodes(selected, id);
        setSelected(null);
      }
    },
    [selected, setSelected]
  );

  if (flow.state === null) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <main>
        <button
          onClick={() => {
            flow.insertNode();
          }}
        >
          Add
        </button>
        <button
          onClick={() => {
            fetch("/flow.json")
              .then((res) => res.json())
              .then((flowData: Flow) => {
                flow.setFlow(flowData);
              });
          }}
        >
          Import flow
        </button>
        <button
          onClick={() => {
            flow.setFlow({
              nodes: {},
              edges: [],
            });
          }}
        >
          Reset
        </button>
        <div className="row mt">
          <div>
            <h3>Nodes</h3>
            {Object.keys(flow.state.nodes).map((k) => (
              <NodeView
                key={k}
                onRemove={flow.removeNode}
                onSelect={onSelect}
                id={k}
                node={flow.state.nodes[k]}
                activeId={selected}
              />
            ))}
          </div>
          <div>
            <h3>Edges</h3>
            {flow.state.edges.map(([src, tgt]) => (
              <p>
                {src ? src.slice(0, 6) : "root"} -{" "}
                {tgt ? tgt.slice(0, 6) : "root"}
              </p>
            ))}
          </div>
        </div>
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
    onSelect,
    activeId,
  }: {
    id: string;
    node: Node;
    onRemove: (id: string) => void;
    onSelect: (id: string) => void;
    activeId: string | null;
  }) => (
    <div className={`node ${id === activeId ? "node--active" : ""}`}>
      <button
        className="remove-button"
        onClick={() => {
          onRemove(id);
        }}
      >
        ×
      </button>
      <div>
        <p>
          {node.text || "unset"}{" "}
          <small>{Math.round(Math.random() * 1000)}</small>
        </p>
        <p>
          <small>{id.slice(0, 6)}..</small>
        </p>
      </div>
      <button
        onClick={() => {
          onSelect(id);
        }}
      >
        {activeId === id
          ? "Deselect"
          : activeId !== null
          ? "Connect"
          : "Select"}
      </button>
    </div>
  ),
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    prevProps.onRemove === nextProps.onRemove &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.activeId === nextProps.activeId &&
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
      <FlowView id={id} />
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
