import { Text } from 'react-native';

interface TitleProps {
  children: string;
  /**
   * Mot ou groupe de mots mis en évidence en chamois.
   * Règle de la charte : un seul par titre.
   */
  highlight?: string;
}

export function Title({ children, highlight }: TitleProps) {
  const index = highlight ? children.indexOf(highlight) : -1;
  const before = index >= 0 ? children.slice(0, index) : children;
  const after = index >= 0 && highlight ? children.slice(index + highlight.length) : '';

  return (
    <Text
      role="heading"
      aria-level={1}
      className="font-sans-extrabold text-3xl text-blanc uppercase md:text-4xl leading-tight tracking-tight"
    >
      {before}
      {index >= 0 && (
        <Text testID="title-highlight" className="text-chamois">
          {highlight}
        </Text>
      )}
      {after}
    </Text>
  );
}
