import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import gsap from "gsap";
import { XIcon } from "@phosphor-icons/react";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, SplitText);

export default function Modal({ children, hasClose, onClose }) {
  const modalRef = useRef(null);

  useGSAP(
    () => {
      gsap.from(modalRef.current, {
        y: 100,
        scale: 0.9,
        duration: 0.25,
        autoAlpha: 0,
        ease: "power1.out",
      });

      if (!hasClose) {
        gsap.from(".stat", {
          scale: 0.5,
          duration: 0.25,
          autoAlpha: 0,
          delay: 0.125,
          ease: "back.out",
          stagger: 0.1,
        });

        gsap.from(".modal-cta", {
          scale: 0.5,
          duration: 0.25,
          autoAlpha: 0,
          delay: 0.125,
          ease: "back.out",
        });

        let split;
        SplitText.create(".modal-text", {
          type: "words, lines",
          autoSplit: true,
          mask: "lines",
          onSplit: (self) => {
            split = gsap.from(self.lines, {
              duration: 0.6,
              yPercent: 100,
              delay: 0.125,
              opacity: 0,
              stagger: 0.1,
              ease: "expo.out",
            });
            return split;
          },
        });
      }
    },
    { scope: modalRef }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-gray-900/20">
      <div
        ref={modalRef}
        className={`relative border-2 border-primary-600 bg-white rounded-lg max-w-lg w-full py-8 px-4 shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {hasClose && (
          <button
            onClick={onClose}
            className="absolute right-2 top-2 text-primary-600 border-orange border-2 grid place-items-center bg-orangeWhite rounded-full hover:bg-white transition-200 transition-colors z-10 h-[32px] w-[32px]"
            aria-label="Close dialog box"
          >
            <XIcon size={16} weight="bold" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
