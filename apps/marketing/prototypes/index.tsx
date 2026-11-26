import type { ReactNode } from "react";
import { Route } from "react-router-dom";
import { Header } from "../src/components/Header";
import { P1 } from "./p1/P1";
import { P2 } from "./p2/P2";
import { P3 } from "./p3/P3";
import "./shared/proto.css";

const PrototypeIndex = () => (
  <div className="proto">
    <Header />
    <main className="proto-index" id="main">
      <h1>Motion prototypes</h1>
      <p>
        Three throwaway versions of the home page, for judging the feel. Development only: a
        production build has none of this. Each page has a panel with a reduce motion switch, the
        frame rate and the added JavaScript.
      </p>
      <ol>
        <li>
          <a href="/prototypes/1">
            <strong>1. Micro-interactions</strong>
            <span>
              CSS only. Hover, focus and press responses, headings that clear as they arrive.
            </span>
          </a>
        </li>
        <li>
          <a href="/prototypes/2">
            <strong>2. Scroll story</strong>
            <span>
              The fog over the sample dashboard thins as you scroll, then sections with depth.
            </span>
          </a>
        </li>
        <li>
          <a href="/prototypes/3">
            <strong>3. 3D hero</strong>
            <span>The Flump orb as a lit sphere in soft fog that parts as you scroll.</span>
          </a>
        </li>
      </ol>
    </main>
  </div>
);

export const prototypeRoutes: ReactNode = [
  <Route element={<PrototypeIndex />} key="index" path="/prototypes" />,
  <Route element={<P1 />} key="p1" path="/prototypes/1" />,
  <Route element={<P2 />} key="p2" path="/prototypes/2" />,
  // Prototype 3 renders on the server like the others; three.js loads after first paint.
  <Route element={<P3 />} key="p3" path="/prototypes/3" />,
];
