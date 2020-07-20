import randomWords from "random-words";
import React, { useEffect, useMemo } from "react";
import { connectToDB, getConnection } from "./sharedb";
import {
  Link,
  BrowserRouter as Router,
  useHistory,
  useLocation,
} from "react-router-dom";

type Flow = {
  nodes: Record<string, {}>;
  edges: Array<[string | null, string]>;
};

function useFlow(config: {
  id: string;
}): {
  state: Flow | null;
  addNode: () => void;
  removeNode: (id: string) => void;
  reset: (flow: Flow) => void;
} {
  const [state, setState] = React.useState<Flow | null>(null);

  const doc = useMemo(() => getConnection(config.id), [config.id]);

  useEffect(() => {
    const cloneStateFromShareDB = () =>
      setState(JSON.parse(JSON.stringify(doc.data)));

    connectToDB(doc).then(() => {
      cloneStateFromShareDB();
      doc.on("op", cloneStateFromShareDB);
    });

    return () => {
      setState(null);
      doc.destroy();
    };
  }, [doc]);

  const addNode = React.useCallback(() => {
    doc.submitOp([{ p: ["nodes", randomWords()], oi: {} }]);
  }, [doc]);

  const removeNode = React.useCallback(
    (id) => {
      doc.submitOp([{ p: ["nodes", id], od: {} }]);
    },
    [doc]
  );

  const reset = React.useCallback(
    (flow) => {
      doc.submitOp([{ p: [], od: doc.data, oi: flow }]);
    },
    [doc]
  );

  return {
    state,
    addNode,
    removeNode,
    reset,
  };
}

const Flow: React.FC<{ id: string }> = ({ id }) => {
  const flow = useFlow({ id });

  if (flow.state === null) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      {Object.keys(flow.state.nodes).map((k) => (
        <Node key={k} onRemove={flow.removeNode} id={k} />
      ))}
      <button
        onClick={() => {
          flow.addNode();
        }}
      >
        ADD
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
        RESET
      </button>
    </div>
  );
};

const Node = React.memo(
  ({ id, onRemove }: { id: string; onRemove: (id: string) => void }) => (
    <h1
      onClick={() => {
        // remove the node
        onRemove(id);
      }}
    >
      {id} {Math.round(Math.random() * 1000)}
    </h1>
  )
);

const App = () => {
  const history = useHistory();
  const location = useLocation();

  const id = React.useMemo(() => {
    console.log("new ID");
    if (location.hash.length < 2) {
      return null;
    }
    return location.hash.slice(1);
  }, [location]);

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
        <Link to="#direct">#direct</Link> <Link to="#captain">#captain</Link>{" "}
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
