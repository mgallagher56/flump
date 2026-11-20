import { Card } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { AI_CONNECTION, AI_CONNECTION_ACCESS, FEATURES } from "../../utils/featureAreas";
import { tileBody, tileGrid, tileLink, tileName, tileNote, tileText } from "./FeatureTiles.styles";

export interface FeatureTilesProps {
  /** h2 on the features page, h3 inside a home page band. */
  headingLevel: 2 | 3;
}

/**
 * The five areas in the app's order, then the AI connection, one tile each with a link named for
 * where it goes (E42 S3 and S5). The AI connection tile carries the decided wording: what it does,
 * then how a tester gets it.
 */
export const FeatureTiles: FC<FeatureTilesProps> = ({ headingLevel }) => {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul aria-label="Flump features" className={tileGrid()}>
      {FEATURES.map((feature) => {
        const isAi = feature.key === AI_CONNECTION.key;
        return (
          <Card as="li" key={feature.key} padding="lg">
            <div className={tileBody()}>
              <Heading className={tileName()}>
                <Link className={tileLink()} to={feature.path}>
                  {feature.name}
                </Link>
              </Heading>
              <p className={tileText()}>{isAi ? feature.menuDescription : feature.lead}</p>
              {isAi && <p className={tileNote()}>{AI_CONNECTION_ACCESS}</p>}
            </div>
          </Card>
        );
      })}
    </ul>
  );
};
