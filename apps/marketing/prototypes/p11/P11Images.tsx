import type { FC } from "react";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { PrototypeShell } from "../shared/PrototypeShell";
import { ImageSheet } from "./art/ImageSheet";

/** /prototypes/11-images: each live spot illustration beside the image that replaces it in 11. */
export const P11Images: FC = () => (
  <PrototypeShell backdrop="both" id="p11" paced panel="closed">
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <ImageSheet />
    </main>
    <Footer />
  </PrototypeShell>
);
