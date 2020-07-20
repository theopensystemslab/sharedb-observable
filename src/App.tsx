import randomWords from "random-words";
import React, { useEffect, useMemo } from "react";
import { connectToDB, getConnection } from "./sharedb";

const loadNewFlow = () => {
  window.location.href = [window.location.origin, randomWords()].join("#");
  // should react to url change rather than full reload
  window.location.reload();
};

function useShareDB<T>(config: {
  id: string;
}): {
  state: T | null;
  submitOp: (ops: any[]) => void;
} {
  const [state, setState] = React.useState<T | null>(null);

  const doc = useMemo(() => {
    return getConnection(config.id);
  }, [config.id]);

  useEffect(() => {
    const cloneStateFromShareDB = () =>
      setState(JSON.parse(JSON.stringify(doc.data)));

    connectToDB(doc).then(() => {
      cloneStateFromShareDB();
      doc.on("op", cloneStateFromShareDB);
    });

    return () => {
      doc.destroy();
    };
  }, [doc]);

  const submitOp = React.useCallback(
    (op) => {
      doc.submitOp(op);
    },
    [doc]
  );

  return {
    state,
    submitOp,
  };
}

const Flow: React.FC<{ id: string }> = ({ id }) => {
  const { state, submitOp } = useShareDB<{ nodes: any }>({ id });

  if (state === null) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      {state.nodes &&
        Object.keys(state.nodes).map((k) => (
          <Node key={k} submitOp={submitOp} id={k} />
        ))}
      <button
        onClick={() => {
          // add a node
          submitOp([{ p: ["nodes", randomWords()], oi: {} }]);
        }}
      >
        ADD
      </button>

      <button onClick={loadNewFlow}>New flow</button>
    </div>
  );
};

const Node = React.memo(({ id, submitOp }: any) => (
  <h1
    onClick={() => {
      // remove the node
      submitOp([{ p: ["nodes", id], od: { [id]: {} } }]);
    }}
  >
    {id} {Math.round(Math.random() * 1000)}
  </h1>
));

const App = () => {
  let [, id] = window.location.href.split("#");
  if (!id) loadNewFlow();

  return <Flow id={id} />;
};

export default App;
