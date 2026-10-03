export function PixelSprite({
  name,
  size = 64,
  className = "",
  alt = "",
}: {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      className={className}
      src={`/sprites/${name}.png`}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
    />
  );
}
