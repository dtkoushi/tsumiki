import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { StackArea } from "./components/stack/StackArea";
import { useTsumikiStore } from "./store/useTsumikiStore";
import { decompressFromUrl } from "./lib/utils/serialization";

function App() {
  const loadProject = useTsumikiStore((state) => state.loadProject);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataDetails = params.get("data");

    if (dataDetails) {
      try {
        const project = decompressFromUrl(dataDetails);
        if (project && project.cards && project.meta) {
          loadProject(project.cards, project.meta.title, project.meta.author);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error("Failed to load shared project", e);
      }
    }
  }, [loadProject]);

  return (
    <AppLayout>
      <StackArea />
    </AppLayout>
  );
}

export default App;
