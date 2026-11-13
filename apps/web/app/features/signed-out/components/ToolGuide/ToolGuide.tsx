import { Card, Heading, Text } from "@repo/ui";
import type { FC } from "react";
import { faqList, guideBlock, guideRoot, guideSection } from "./ToolGuide.styles";

export interface ToolGuideProps {
  guideSections: readonly { heading: string; body: readonly string[] }[];
  faqs: readonly { q: string; a: string }[];
}

/** Reading guide and FAQ under a calculator. */
export const ToolGuide: FC<ToolGuideProps> = ({ guideSections, faqs }) => (
  <div className={guideRoot()}>
    <section aria-labelledby="tool-guide-heading" className={guideSection()}>
      <Heading as="h2" id="tool-guide-heading" size="lg">
        Guide and UK tax rules
      </Heading>
      {guideSections.map((section) => (
        <div className={guideBlock()} key={section.heading}>
          <Heading as="h3" size="md">
            {section.heading}
          </Heading>
          {section.body.map((paragraph) => (
            <Text color="secondary" key={paragraph} textStyle="body.md">
              {paragraph}
            </Text>
          ))}
        </div>
      ))}
    </section>

    <section aria-labelledby="tool-faq-heading" className={faqList()}>
      <Heading as="h2" id="tool-faq-heading" size="lg">
        Frequently asked questions
      </Heading>
      {faqs.map((faq) => (
        <Card as="article" elevation="none" key={faq.q} padding="md">
          <Heading as="h3" size="sm">
            {faq.q}
          </Heading>
          <Text color="secondary" textStyle="body.sm">
            {faq.a}
          </Text>
        </Card>
      ))}
    </section>
  </div>
);

export default ToolGuide;
