import { isNative } from "@/lib/native";
import AppEntry from "./AppEntry";
import PublicHome from "./PublicHome";

const Index = () => {
  // Installed apps retain their existing entry; web visitors can browse freely.
  return isNative() ? <AppEntry /> : <PublicHome />;
};

export default Index;
