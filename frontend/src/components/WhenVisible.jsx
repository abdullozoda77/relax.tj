import { useEffect, useRef, useState } from "react";

// Shows `children` only when this block comes close to the screen; until then `placeholder` stands in.
// Heavy 3D maps are then not downloaded and started for visitors who never scroll to them (important on phones).
export default function WhenVisible({ children, placeholder, margin = "300px" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, margin]);

  return visible ? children : <div ref={ref}>{placeholder}</div>;
}
