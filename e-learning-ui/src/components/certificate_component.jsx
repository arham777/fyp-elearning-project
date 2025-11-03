import React, { useEffect, useRef, useState, forwardRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { User, Download } from "lucide-react";
import { motion } from "framer-motion";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Certificate = forwardRef(({
  fullName,
  courseName,
  teacherName,
  courseCode,
  issueDate,
  studentImage,
  showDownloadButton = true,
}, ref) => {
  const displayName = fullName || "Student";
  const displayCourse = courseName || "Course";
  const displayTeacher = teacherName || "Instructor";
  const displayCode = courseCode || "—";
  const displayDate = issueDate || "—";

  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, message: '' });

  // Compute responsive certificate card size
  useEffect(() => {
    const computeSize = () => {
      const margin = 48; // Account for padding and margins
      const vw = window.innerWidth - margin;
      // Use available container height instead of full viewport
      const vh = window.innerHeight - 120; // Reserve space for dashboard header (~80px) + margins
      const aspectRatio = 16 / 9;

      let width, height;

      // Check if container is constrained by height
      if (vw / vh > aspectRatio) {
        height = vh;
        width = height * aspectRatio;
      } else {
        width = vw;
        height = width / aspectRatio;
      }

      const maxWidth = 1000;
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      const minWidth = 320; // Increased for better mobile experience
      if (width < minWidth) {
        width = minWidth;
        height = width / aspectRatio;
      }

      setCardSize({ width, height });
    };

    computeSize();
    window.addEventListener("resize", computeSize);
    return () => window.removeEventListener("resize", computeSize);
  }, []);

  // Base unit for proportional scaling with mobile optimization
  const baseUnit = cardSize.width / 100;
  
  // Enhanced mobile-friendly font sizing
  const isMobile = cardSize.width < 500;
  const mobileMultiplier = isMobile ? 0.8 : 1;
  
  const getFontSize = (baseSize, minSize) => {
    const scaledSize = baseUnit * baseSize * mobileMultiplier;
    return Math.max(scaledSize, minSize);
  };

  // PDF Download Function
  const downloadAsPDF = async () => {
    if (!ref?.current || isDownloading) return;
    
    setIsDownloading(true);
    
    // Create a global CSS override to force RGB colors everywhere
    // This bypasses Tailwind's oklch() wrapper by directly setting RGB values
    const globalStyleOverride = document.createElement('style');
    globalStyleOverride.id = 'pdf-global-override';
    globalStyleOverride.textContent = `
      /* CRITICAL: Override ALL Tailwind color utilities with direct RGB values */
      /* This bypasses the oklch() wrapper in tailwind.config.ts */
      
      /* Certificate root colors */
      [data-certificate="true"] {
        background-color: rgb(25, 25, 25) !important;
        color: rgb(250, 250, 250) !important;
        border-color: rgb(70, 70, 70) !important;
      }
      
      /* Text colors */
      [data-certificate="true"] .text-neutral-50 { color: rgb(250, 250, 250) !important; }
      [data-certificate="true"] .text-neutral-100 { color: rgb(250, 250, 250) !important; }
      [data-certificate="true"] .text-neutral-200 { color: rgb(229, 229, 229) !important; }
      [data-certificate="true"] .text-neutral-300 { color: rgb(212, 212, 212) !important; }
      [data-certificate="true"] .text-neutral-400 { color: rgb(163, 163, 163) !important; }
      [data-certificate="true"] .text-neutral-500 { color: rgb(115, 115, 115) !important; }
      [data-certificate="true"] .text-neutral-600 { color: rgb(82, 82, 82) !important; }
      [data-certificate="true"] .text-neutral-700 { color: rgb(64, 64, 64) !important; }
      [data-certificate="true"] .text-neutral-800 { color: rgb(38, 38, 38) !important; }
      [data-certificate="true"] .text-neutral-900 { color: rgb(23, 23, 23) !important; }
      [data-certificate="true"] .text-neutral-950 { color: rgb(10, 10, 10) !important; }
      
      /* Background colors */
      [data-certificate="true"] .bg-neutral-50 { background-color: rgb(250, 250, 250) !important; }
      [data-certificate="true"] .bg-neutral-100 { background-color: rgb(245, 245, 245) !important; }
      [data-certificate="true"] .bg-neutral-200 { background-color: rgb(229, 229, 229) !important; }
      [data-certificate="true"] .bg-neutral-300 { background-color: rgb(212, 212, 212) !important; }
      [data-certificate="true"] .bg-neutral-400 { background-color: rgb(163, 163, 163) !important; }
      [data-certificate="true"] .bg-neutral-500 { background-color: rgb(115, 115, 115) !important; }
      [data-certificate="true"] .bg-neutral-600 { background-color: rgb(82, 82, 82) !important; }
      [data-certificate="true"] .bg-neutral-700 { background-color: rgb(64, 64, 64) !important; }
      [data-certificate="true"] .bg-neutral-800 { background-color: rgb(38, 38, 38) !important; }
      [data-certificate="true"] .bg-neutral-900 { background-color: rgb(23, 23, 23) !important; }
      [data-certificate="true"] .bg-neutral-950 { background-color: rgb(10, 10, 10) !important; }
      
      /* Arbitrary value classes */
      [data-certificate="true"] .bg-\\[\\#191919\\] { background-color: rgb(25, 25, 25) !important; }
      [data-certificate="true"] .bg-\\[\\#1a1a1a\\] { background-color: rgb(26, 26, 26) !important; }
      
      /* Border colors */
      [data-certificate="true"] .border-neutral-50 { border-color: rgb(250, 250, 250) !important; }
      [data-certificate="true"] .border-neutral-100 { border-color: rgb(245, 245, 245) !important; }
      [data-certificate="true"] .border-neutral-200 { border-color: rgb(229, 229, 229) !important; }
      [data-certificate="true"] .border-neutral-300 { border-color: rgb(212, 212, 212) !important; }
      [data-certificate="true"] .border-neutral-400 { border-color: rgb(163, 163, 163) !important; }
      [data-certificate="true"] .border-neutral-500 { border-color: rgb(115, 115, 115) !important; }
      [data-certificate="true"] .border-neutral-600 { border-color: rgb(82, 82, 82) !important; }
      [data-certificate="true"] .border-neutral-700 { border-color: rgb(64, 64, 64) !important; }
      [data-certificate="true"] .border-neutral-800 { border-color: rgb(38, 38, 38) !important; }
      [data-certificate="true"] .border-neutral-900 { border-color: rgb(23, 23, 23) !important; }
      [data-certificate="true"] .border-neutral-950 { border-color: rgb(10, 10, 10) !important; }
      
      /* Ring colors (for Avatar component) */
      [data-certificate="true"] .ring-neutral-700 {
        --tw-ring-color: rgb(64, 64, 64) !important;
        box-shadow: 0 0 0 3px rgb(64, 64, 64) !important;
      }
      [data-certificate="true"] .ring-0 {
        --tw-ring-offset-width: 0px !important;
        box-shadow: none !important;
      }
      
      /* Remove any shadows that might use oklch */
      [data-certificate="true"] .shadow-none { box-shadow: none !important; }
      
      /* Rounded borders */
      [data-certificate="true"] .rounded-xl { border-radius: 0.75rem !important; }
      [data-certificate="true"] .rounded-full { border-radius: 9999px !important; }
      
      /* Border widths */
      [data-certificate="true"] .border { border-width: 1px !important; }
      [data-certificate="true"] .border-4 { border-width: 4px !important; }
    `;
    
    try {
      // Wait for any ongoing animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create filename: StudentName-CourseName.pdf
      const sanitize = (str) => str.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '');
      const studentName = sanitize(displayName);
      const courseTitle = sanitize(displayCourse);
      const filename = `${studentName}-${courseTitle}.pdf`;
      
      // Inject global style override
      document.head.appendChild(globalStyleOverride);
      
      // Force reflow and wait for styles to apply
      void document.body.offsetHeight;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Create high quality canvas with certificate's dark background
      const canvas = await html2canvas(ref.current, {
        scale: 2, // Higher resolution for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'rgb(25, 25, 25)', // Use RGB format
        width: cardSize.width,
        height: cardSize.height,
        windowWidth: cardSize.width,
        windowHeight: cardSize.height,
        logging: false, // Reduce console output
        onclone: (clonedDoc) => {
          // CRITICAL: Override OKLCH colors GLOBALLY in the cloned document
          // html2canvas processes the entire DOM tree, not just the certificate
          const globalRgbOverride = clonedDoc.createElement('style');
          globalRgbOverride.textContent = `
            /* Force ALL elements in cloned doc to use RGB */
            *, *::before, *::after {
              background-color: inherit !important;
              color: inherit !important;
              border-color: inherit !important;
            }
            
            /* Set RGB colors on root elements */
            html, body {
              background-color: rgb(25, 25, 25) !important;
              color: rgb(250, 250, 250) !important;
            }
            
            ${globalStyleOverride.textContent}
          `;
          clonedDoc.head.appendChild(globalRgbOverride);
          
          // Force ALL elements in the entire cloned document to have explicit RGB inline styles
          // This is the nuclear option - override everything
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((element) => {
            try {
              // Force transparent/clear backgrounds to rgb
              const computedStyle = element.ownerDocument.defaultView.getComputedStyle(element);
              
              const bg = computedStyle.backgroundColor;
              if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                element.style.backgroundColor = bg;
              } else {
                // Force transparent to explicit rgb
                element.style.backgroundColor = 'rgba(0, 0, 0, 0)';
              }
              
              const color = computedStyle.color;
              if (color) {
                element.style.color = color;
              }
              
              const borderColor = computedStyle.borderTopColor;
              if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
                element.style.borderColor = borderColor;
              }
            } catch (e) {
              // Skip inaccessible elements
            }
          });
          
          // Force certificate root to have explicit RGB colors
          const clonedCert = clonedDoc.querySelector('[data-certificate="true"]');
          if (clonedCert) {
            clonedCert.style.backgroundColor = 'rgb(25, 25, 25)';
            clonedCert.style.color = 'rgb(250, 250, 250)';
            clonedCert.style.borderColor = 'rgb(70, 70, 70)';
          }
          
          // Force inline styles on all certificate children
          const originalCert = document.querySelector('[data-certificate="true"]');
          if (originalCert && clonedCert) {
            const originalElements = originalCert.querySelectorAll('*');
            const clonedElements = clonedCert.querySelectorAll('*');
            
            // Match original elements to cloned elements by index and copy computed styles
            originalElements.forEach((origEl, index) => {
              if (clonedElements[index]) {
                try {
                  const computedStyle = window.getComputedStyle(origEl);
                  const clonedEl = clonedElements[index];
                  
                  // Copy all color-related computed styles as inline styles
                  const colorProps = [
                    'backgroundColor',
                    'color',
                    'borderTopColor',
                    'borderRightColor',
                    'borderBottomColor',
                    'borderLeftColor',
                    'outlineColor'
                  ];
                  
                  colorProps.forEach(prop => {
                    const value = computedStyle[prop];
                    if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
                      clonedEl.style[prop] = value;
                    }
                  });
                  
                  // Handle shadows
                  if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
                    clonedEl.style.boxShadow = computedStyle.boxShadow;
                  }
                  if (computedStyle.textShadow && computedStyle.textShadow !== 'none') {
                    clonedEl.style.textShadow = computedStyle.textShadow;
                  }
                } catch (e) {
                  // Skip if can't access element
                }
              }
            });
          }
        }
      });
      
      // Remove global style override
      document.head.removeChild(globalStyleOverride);
      
      // Calculate exact dimensions for 16:9 ratio PDF (no white space)
      const aspectRatio = 16 / 9;
      const certificateWidthMM = 210; // Optimal width for certificate viewing
      const certificateHeightMM = certificateWidthMM / aspectRatio; // Maintain exact 16:9 ratio
      
      // Create PDF with exact certificate dimensions (perfect fit, no extra margins)
      const pdf = new jsPDF({
        orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [certificateWidthMM, certificateHeightMM] // Custom size matching certificate exactly
      });
      
      // Add the certificate image to fill the entire PDF page (edge-to-edge)
      pdf.addImage(
        canvas.toDataURL('image/png', 1.0), // High quality PNG
        'PNG',
        0, // No left margin
        0, // No top margin  
        certificateWidthMM, // Full width coverage
        certificateHeightMM, // Full height coverage
        undefined, // alias
        'FAST' // Compression mode for better performance
      );
      
      // Save the PDF with dynamic filename
      pdf.save(filename);
      
      console.log(`✅ Certificate downloaded successfully!`);
      console.log(`📄 Filename: ${filename}`);
      console.log(`📐 PDF Dimensions: ${certificateWidthMM}mm × ${certificateHeightMM}mm (16:9 ratio)`);
      
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      
      // Remove global style override in case of error
      const existingOverride = document.getElementById('pdf-global-override');
      if (existingOverride) {
        document.head.removeChild(existingOverride);
      }
      
      setErrorDialog({
        open: true,
        message: 'Failed to download certificate. Please try again or contact support if the issue persists.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title="Download Failed"
        message={errorDialog.message}
        onRetry={downloadAsPDF}
      />
      <div className="grid place-items-center bg-transparent p-3 font-roboto w-full h-full overflow-hidden">
      <motion.div
        className="relative w-full"
        style={{ width: `${cardSize.width}px`, height: `${cardSize.height}px` }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Certificate Download Button - Positioned relative to certificate */}
        {showDownloadButton && (
          <div 
            className="absolute z-30 transition-all duration-200"
            style={{
              top: isMobile ? '12px' : `${Math.max(baseUnit * 1.5, 16)}px`,
              right: isMobile ? '12px' : `${Math.max(baseUnit * 1.5, 16)}px`,
            }}
          >
            <Button
              onClick={downloadAsPDF}
              disabled={isDownloading}
              size={isMobile ? "sm" : "default"}
              variant="secondary"
              className="bg-neutral-900/95 hover:bg-neutral-800/95 text-white border-neutral-700/80 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-orange-500/20"
              style={{
                fontSize: isMobile ? '11px' : '13px',
                padding: isMobile ? '6px 10px' : '8px 14px',
                borderRadius: '6px',
              }}
            >
              {isDownloading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-2"></div>
                  <span className={isMobile ? "text-xs" : "text-sm"}>
                    {isMobile ? "PDF..." : "Generating PDF..."}
                  </span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Download className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-2`} />
                  <span className={isMobile ? "text-xs" : "text-sm"}>
                    {isMobile ? "PDF" : "Download PDF"}
                  </span>
                </div>
              )}
            </Button>
          </div>
        )}
        
        <div
          ref={ref}
          data-certificate="true"
          className="relative rounded-xl border border-neutral-800 bg-[#191919] text-neutral-100 overflow-hidden w-full h-full"
        >
          <div className="relative w-full h-full" style={{ padding: `${baseUnit * 4}px` }}>
            {/* Top-left: Course name and code */}
            <div
              className="absolute text-left"
              style={{ top: `${baseUnit * 3.5}px`, left: `${baseUnit * 3.5}px` }}
            >
              <div
                className="font-yeseva"
                style={{ fontSize: `${getFontSize(2.2, 7)}px`, lineHeight: '1.4' , paddingBottom: '3px'}}
              >
                {displayCourse}
              </div>
              <div
                className="font-roboto text-neutral-400 mt-1"
                style={{ fontSize: `${getFontSize(1.4, 5)}px` }}
              >
                Course Code: {displayCode}
              </div>
            </div>

            {/* Title center-top */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[18%] text-center">
              <h1
                className="font-norwester font-normal uppercase tracking-[0.06em] whitespace-nowrap"
                style={{
                  fontFamily: "Norwester, 'Bebas Neue', Oswald, Impact, sans-serif",
                  fontWeight: 400,
                  fontSize: `${getFontSize(3.8, 8)}px`,
                  lineHeight: '1.3',
                  paddingBottom: '2px'
                }}
              >
                Certificate of Completion
              </h1>
              <p
                className="font-roboto text-neutral-400 mt-2"
                style={{ fontSize: `${getFontSize(1.6, 5)}px` }}
              >
                This is to proudly certify that
              </p>
            </div>

            {/* Middle: Avatar + Name + Supporting line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-[25%] flex flex-col items-center w-[90%]">
              <div className="flex flex-col sm:flex-row items-center justify-center" style={{ gap: `${Math.max(baseUnit * 3 * mobileMultiplier, 4)}px` }}>
                <Avatar
                  className="border-4 border-neutral-700 ring-0 ring-neutral-700 bg-neutral-300"
                  style={{ width: `${Math.max(baseUnit * 11 * mobileMultiplier, 20)}px`, height: `${Math.max(baseUnit * 11 * mobileMultiplier, 20)}px` }}
                >
                    {studentImage ? (
                      <AvatarImage src={studentImage} alt={displayName} />
                    ) : (
                      <AvatarFallback className="bg-neutral-300">
                      <User
                        className="text-neutral-900"
                        style={{ width: `${Math.max(baseUnit * 6 * mobileMultiplier, 10)}px`, height: `${Math.max(baseUnit * 6 * mobileMultiplier, 10)}px` }}
                      />
                      </AvatarFallback>
                    )}
                  </Avatar>
                <div className="text-center sm:text-left max-w-[60%] sm:max-w-none">
                  <div
                    className="font-norwester tracking-[0.04em] leading-none break-words"
                    style={{ fontSize: `${getFontSize(5.5, 10)}px` }}
                  >
                    {displayName}
                  </div>
                </div>
              </div>
              <div className="text-center" style={{ marginTop: `${baseUnit * 2}px` }}>
                <p
                  className="font-roboto text-neutral-300"
                  style={{ fontSize: `${getFontSize(1.8, 5)}px` }}
                >
                  has successfully completed the course
                </p>
              </div>
            </div>

            {/* Bottom meta */}
            <div
              className="absolute text-left"
              style={{ bottom: `${baseUnit * 3.5}px`, left: `${baseUnit * 3.5}px`, fontSize: `${getFontSize(1.4, 5)}px` }}
            >
              <p className="font-roboto text-neutral-300">
                Issued on: <span className="text-neutral-100">{displayDate}</span>
              </p>
            </div>
            <div
              className="absolute text-right"
              style={{ bottom: `${baseUnit * 3.5}px`, right: `${baseUnit * 3.5}px`, fontSize: `${getFontSize(1.4, 5)}px` }}
            >
              <p className="font-roboto text-neutral-300">
                Instructor: <span className="text-neutral-100">{displayTeacher}</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    </>
  );
});

Certificate.displayName = "Certificate";

export default Certificate;
