import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [test, setTest] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:8080/hello")
      .then((res) => res.json())
      .then((data) => setTest(data.message));
  }, []);
  return (
    <>
      <div className="text-2xl bg-amber-300">
        spring Bootからのレスポンス{test}
      </div>
    </>
  );
}

export default App;
