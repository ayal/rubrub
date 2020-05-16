import * as React from "react";
import "./styles.css";
import hubhub, { DocType } from "hubhub";

const process = (docs: Array<DocType>) => {
  docs.sort((a, b) => a.time - b.time);
  const newdocs = Object.values(
    docs.reduce<{ [key: string]: DocType }>((acc, doc) => {
      acc[doc.doc_id] = doc;
      return acc;
    }, {})
  );
  return newdocs;
};

hubhub.init("https://ayalg5.wixsite.com/pubsub");
interface AppProps {

}

interface RoomToMessages {
  [roomname: string]: Array<DocType>
}

const App: React.FC<AppProps> = () => {
  console.log("rendering app....");
  const [roomdocs, setRoomDocs] = React.useState<RoomToMessages>({});
  const [rooms, setRooms] = React.useState<Array<DocType>>([]);
  const [room, setRoom] = React.useState<DocType>();

  const [ready, setReady] = React.useState(false);
  const [authReady, setAuthReady] = React.useState<any>(null);
  const [name, setName] = React.useState('');


  React.useEffect(() => {
    console.log("waiting for ready...");
    hubhub.ready.then(async () => {
      console.log("ready!");
      const _rooms = await hubhub.get("rooms", 0);

      setRooms(process(_rooms));

      hubhub.on("rooms", (newrooms: Array<DocType>) => {
        console.log("got documents from rooms", newrooms);
        setRooms(_rooms => process([..._rooms, ...newrooms]));
      });

      hubhub.authReady.then((user) => {
        console.log('first auth ready', user);
        setReady(true);
        if (user.nickname) {
          setAuthReady(user);
        }
      })
    });
    return () => {
      console.log("should kill");
      hubhub.kill();
    };
  }, []);

  React.useEffect(() => {
    if (!room) {
      return;
    }
    hubhub.ready.then(async () => {
      const collection = `${room.data.name}-messages`;
      const docs = await hubhub.get(collection, 0);
      console.log("docs in room are", room, docs);

      setRoomDocs((_roomdocs:RoomToMessages) => ({..._roomdocs,
        [room.data.name]: process([...docs])}));

      hubhub.on(collection, (newdocs: Array<DocType>) => {
        console.log("got documents from", collection, newdocs);
        setRoomDocs((_roomdocs:RoomToMessages) => ({..._roomdocs,
          [room.data.name]: process([..._roomdocs[room.data.name], ...newdocs])}));
    });
  });
}, [room])

  React.useEffect(() => {
    if (name) {
      hubhub.auth(name).then((user: any) => {
        setAuthReady(user);
      })
    }
  }, [name])

if (!ready) {
  return <div>loading</div>
}

if (!authReady) {
  return <div>
    <input value={name} onChange={e => setName(e.target.value)} />
    <button>login</button>
  </div>
}

return (
  <div className="App">
    <div>You are {authReady!.nickname}</div>
    <div>Room is {room ? (room.data as any).name : '?'}</div>

    <button onClick={e => {
      const roomName = prompt('new room name');
      hubhub.set('rooms', { name: roomName }, true);
    }}>new room</button>
    {rooms.map(room => {
      return (
        <div
          onClick={() => {
            console.log(room);
            setRoom(room);
          }}
          key={room.doc_id}
        >
          {(room.data as any).name}
        </div>
      );
    })}
    <button
      onClick={e => {
        if (room) {
           hubhub.set(`${room.data.name}-messages`, { thetime: new Date().getTime() }, true);
        }
      }}
    >send message</button>
    {room && roomdocs[room.data.name] && 
    roomdocs[room.data.name].map(doc => {
      return (
        <div
          onClick={() => {
            console.log(doc);
            const newdata = doc.data;
            (newdata as any).thetime += 1;
            hubhub.update(doc.doc_id, newdata);
          }}
          key={doc.doc_id}
        >
          {doc?.sender?.name}
          {(doc.data as any).thetime}
        </div>
      );
    })}
  </div>
);
}

export default App;
