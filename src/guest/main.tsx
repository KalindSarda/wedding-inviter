import { render } from "preact";
import { t, type Lang } from "../../i18n";

const lang: Lang = "en";

function App() {
  return (
    <main>
      <h1>{t(lang, "app.title")}</h1>
      <p>{t(lang, "hello")}</p>
    </main>
  );
}

render(<App />, document.getElementById("app")!);
