import * as React from "react";
import "./styles.css";
import hubhub, { DocType } from "hubhub";

const process = docs => {
  docs.sort((a, b) => a.time - b.time);
  const newdocs = Object.values(
    docs.reduce((acc, doc) => {
      acc[doc.doc_id] = doc;
      return acc;
    }, {})
  );
  return newdocs;
};

hubhub.init("https://ayalg5.wixsite.com/pubsub");
export default function App() {
  console.log("rendering app....");
  const [docs, setDocs] = React.useState([]);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    console.log("waiting for ready...");
    hubhub.ready.then(async () => {
      console.log("ready!");
      const _docs = await hubhub.get("love");
      console.log("docs are", _docs);
      setDocs(process(_docs));
      hubhub.on("love", (newdocs: Array<DocType>) => {
        console.log("got documents from love", newdocs);
        setDocs(_docs => process([..._docs, ...newdocs]));
      });
      setReady(true);
    });
    return () => {
      console.log("should kill");
      hubhub.kill();
    };
  }, []);
  if (!ready) {
    return "loading";
  }
  return (
    <div className="App">
      <button
        onClick={e => {
          hubhub.set("love", { thetime: new Date().getTime() });
        }}
      />
      {docs.map(doc => {
        return (
          <div
            onClick={() => {
              console.log(doc);
              const newdata = doc.data;
              newdata.thetime += 1;
              hubhub.update(doc.doc_id, newdata);
            }}
            key={doc.doc_id}
          >
            {doc.data.thetime}
          </div>
        );
      })}
    </div>
  );
}
