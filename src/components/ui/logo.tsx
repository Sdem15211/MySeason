import Image from "next/image";

export const Logo = () => {
  return (
    <Image
      src="/assets/myseason.svg"
      alt="MySeason"
      width={60}
      height={60}
      className="w-15 h-15"
    />
  );
};
