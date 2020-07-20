import randomWords from "random-words";
import React, { useEffect, useRef } from "react";
import { connectToDB, getConnection } from "./sharedb";

const loadNewFlow = () => {
  window.location.href = [window.location.origin, randomWords()].join("#");
  // should react to url change rather than full reload
  window.location.reload();
};

const Flow: React.FC<{ id: string }> = ({ id }) => {
  const [state, setState] = React.useState<any>();
  const docRef = useRef(null);

  useEffect(() => {
    // should probably useContext or something rather than
    // this useRef stuff
    docRef.current = getConnection(id);
    const doc = docRef.current;

    const cloneStateFromShareDB = () =>
      setState(JSON.parse(JSON.stringify(doc.data)));

    connectToDB(doc).then(() => {
      cloneStateFromShareDB();
      doc.on("op", cloneStateFromShareDB);
    });

    return () => {
      docRef.current.destroy();
    };
  }, []);

  return (
    <div>
      {state?.nodes &&
        Object.keys(state.nodes).map((k) => (
          <Node key={k} doc={docRef.current} id={k} />
        ))}
      <button
        onClick={() => {
          // add a node
          docRef.current.submitOp([{ p: ["nodes", randomWords()], oi: {} }]);
        }}
      >
        ADD
      </button>

      <button onClick={loadNewFlow}>New flow</button>
    </div>
  );
};

const Node = React.memo(({ id, doc }: any) => (
  <h1
    onClick={() => {
      // remove the node
      doc.submitOp([{ p: ["nodes", id], od: doc.data.nodes[id] }]);
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
