import { dynamicIconImports } from "lucide-react/dynamic.mjs";
import { Church } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

type DynamicLucideIconProps = LucideProps & {
  name: string;
};

const iconLoaders = dynamicIconImports as Record<string, () => Promise<{ default: LucideIcon }>>;

const toLucideIconName = (name: string) =>
  name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

/**
 * Renders a Lucide icon supplied by name without loading the entire icon set.
 * Invalid or unavailable names intentionally fall back to the church icon.
 */
export const DynamicLucideIcon = ({ name, ...props }: DynamicLucideIconProps) => {
  const [Icon, setIcon] = useState<LucideIcon>(() => Church);

  useEffect(() => {
    let current = true;
    const loader = iconLoaders[toLucideIconName(name)];

    setIcon(() => Church);
    if (!loader) return () => {
      current = false;
    };

    void loader()
      .then((module) => {
        if (current) setIcon(() => module.default);
      })
      .catch(() => {
        if (current) setIcon(() => Church);
      });

    return () => {
      current = false;
    };
  }, [name]);

  return <Icon {...props} />;
};
