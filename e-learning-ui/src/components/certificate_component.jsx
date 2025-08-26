import React, { useEffect, useRef, useState, forwardRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    
    try {
      // Wait for any ongoing animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create filename: StudentName-CourseName.pdf
      const sanitize = (str) => str.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '');
      const studentName = sanitize(displayName);
      const courseTitle = sanitize(displayCourse);
      const filename = `${studentName}-${courseTitle}.pdf`;
      
      // Create high quality canvas with certificate's dark background
      const canvas = await html2canvas(ref.current, {
        scale: 2, // Higher resolution for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#191919', // Match certificate's exact dark background
        width: cardSize.width,
        height: cardSize.height,
        windowWidth: cardSize.width,
        windowHeight: cardSize.height,
        logging: false, // Reduce console output
      });
      
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
      alert('Failed to download certificate. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
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
                className="font-yeseva leading-tight"
                style={{ fontSize: `${getFontSize(2.2, 7)}px` }}
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
                className="font-norwester font-normal uppercase leading-none tracking-[0.06em] whitespace-nowrap"
                style={{
                  fontFamily: "Norwester, 'Bebas Neue', Oswald, Impact, sans-serif",
                  fontWeight: 400,
                  fontSize: `${getFontSize(3.8, 8)}px`,
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
  );
});

Certificate.displayName = "Certificate";

export default Certificate;
