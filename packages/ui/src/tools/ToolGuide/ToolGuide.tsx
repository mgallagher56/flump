import { ChevronDown } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Heading } from "../../primitives/Heading/Heading";
import { Icon } from "../../primitives/Icon/Icon";
import { Text } from "../../primitives/Text/Text";
import type { ToolFaq, ToolGuideSection } from "../toolGuides";
import {
  guideAction,
  guideBlock,
  guideBody,
  guideChevron,
  guideCount,
  guideCue,
  guideDetails,
  guideRoot,
  guideSummary,
  guideTitle,
  guideTitleRow,
} from "./ToolGuide.styles";

export interface ToolGuideProps {
  guideSections: readonly ToolGuideSection[];
  faqs: readonly ToolFaq[];
}

const countFormat = new Intl.NumberFormat("en-GB");

interface PanelProps {
  title: string;
  count: number;
  noun: { one: string; other: string };
  children: ReactNode;
}

/**
 * One closed native `<details>` panel. The text is in the server-rendered HTML (crawlers
 * read it) and opens without JavaScript; the look matches the `CollapsibleDrawer` card.
 */
const GuidePanel: FC<PanelProps> = ({ title, count, noun, children }) => (
  <details className={guideDetails()}>
    <summary className={guideSummary()}>
      <span className={guideTitleRow()}>
        <span className={guideTitle()}>{title}</span>
        <span className={guideCount()}>
          {countFormat.format(count)} {count === 1 ? noun.one : noun.other}
        </span>
      </span>
      <span aria-hidden="true" className={guideAction()}>
        <span className={guideCue({ when: "closed" })}>Show</span>
        <span className={guideCue({ when: "open" })}>Hide</span>
        <span className={guideChevron()}>
          <Icon icon={ChevronDown} size="sm" />
        </span>
      </span>
    </summary>
    <div className={guideBody()}>{children}</div>
  </details>
);

/**
 * The reading guide and FAQ under a public calculator, each in a closed panel so nothing but the
 * tool competes for the first view (E16 PR 11). Shared by the web app and marketing.
 */
export const ToolGuide: FC<ToolGuideProps> = ({ guideSections, faqs }) => (
  <div className={guideRoot()} data-tool-guide="">
    {guideSections.length > 0 && (
      <GuidePanel
        count={guideSections.length}
        noun={{ one: "section", other: "sections" }}
        title="Guide"
      >
        {guideSections.map((section) => (
          <section className={guideBlock()} key={section.heading}>
            <Heading as="h3" size="md">
              {section.heading}
            </Heading>
            {section.body.map((paragraph) => (
              <Text color="secondary" key={paragraph} textStyle="body.md">
                {paragraph}
              </Text>
            ))}
          </section>
        ))}
      </GuidePanel>
    )}

    {faqs.length > 0 && (
      <GuidePanel
        count={faqs.length}
        noun={{ one: "question", other: "questions" }}
        title="Frequently asked questions"
      >
        {faqs.map((faq) => (
          <article className={guideBlock()} key={faq.q}>
            <Heading as="h3" size="sm">
              {faq.q}
            </Heading>
            <Text color="secondary" textStyle="body.sm">
              {faq.a}
            </Text>
          </article>
        ))}
      </GuidePanel>
    )}
  </div>
);

export default ToolGuide;
