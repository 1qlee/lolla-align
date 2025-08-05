import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export default function Modal({ isOpen, children }) {
  const modalRef = useRef(null);

  useGSAP(() => {
    gsap.from(modalRef, {
      y: 100,
      scale: 0.8,
      duration: 0.5,
    });
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-gray-900/20">
      <div
        ref={modalRef}
        className={`relative border-2 border-primary-600 bg-white rounded-lg max-w-lg w-full py-8 px-4 shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {children}
      </div>
    </div>
  );
}
