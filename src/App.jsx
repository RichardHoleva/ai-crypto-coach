import ChatBox from "./components/ChatBot";
import Navbar from "./components/Navbar";

function App() {
  return (
    <div className="h-screen w-full text-white flex flex-col app-chat">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <ChatBox />
      </div>
    </div>
  );
}

export default App;
