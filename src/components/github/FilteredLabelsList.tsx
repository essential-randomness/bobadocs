import { hsl, parseHex } from "culori";

import React from "react";
import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import labels from "../../_generated_data/labels.json";
import styles from "./FilteredLabelsList.module.css";
import twemoji from "twemoji";

const Label = ({
  name,
  color,
}: RestEndpointMethodTypes["issues"]["listLabelsForRepo"]["response"]["data"][0]) => {
  const labelRef = React.useRef();
  const rgbData = parseHex(color);
  const hslData = hsl(rgbData);
  const colorStyles = {
    "--label-r": rgbData.r * 255,
    "--label-g": rgbData.g * 255,
    "--label-b": rgbData.b * 255,
    "--label-h": hslData.h,
    "--label-s": hslData.s * 100,
    "--label-l": hslData.l * 100,
  } as React.CSSProperties;

  React.useEffect(() => {
    twemoji.parse(labelRef.current);
  }, [name]);

  return (
    <a
      href={`https://github.com/BobaBoard/issues/labels/${encodeURI(name)}`}
      className={styles.label}
      style={colorStyles}
      ref={labelRef}
    >
      {name}
    </a>
  );
};

const FilteredLabelsList = ({ prefix }: { prefix: string }) => {
  const filteredLabels = labels.filter((label) =>
    label.name.startsWith(prefix)
  );

  return (
    <div className={styles.labelGrid}>
      {filteredLabels.map((label) => (
        <React.Fragment key={label.id}>
          <Label {...label} />
          <div>{label.description}</div>
        </React.Fragment>
      ))}
    </div>
  );
};
export default FilteredLabelsList;
