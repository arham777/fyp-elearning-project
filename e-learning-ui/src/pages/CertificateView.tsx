import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coursesApi } from '@/api/courses';
import { Certificate as CertificateType } from '@/types';
import CertificateDesign from '@/components/certificate_component';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const CertificateView: React.FC = () => {
  const { id } = useParams();
  const certificateId = Number(id);
  const [certificate, setCertificate] = useState<CertificateType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!Number.isNaN(certificateId)) {
          const data = await coursesApi.getCertificate(certificateId);
          setCertificate(data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [certificateId]);

  // Lock page scroll while viewing the certificate
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const fullName = useMemo(() => {
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
    return name || user?.username || 'Student';
  }, [user]);

  if (isLoading) return <div className="h-40 bg-muted rounded" />;
  if (!certificate) return <div className="text-sm text-muted-foreground">Certificate not found.</div>;

  const courseName = certificate.course?.title || 'Course';
  const teacherName = certificate.course?.teacher?.username || 'Instructor';
  const issueDate = new Date(certificate.issue_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const code = certificate.verification_code;

  return (
    <div className="relative h-full">
      <div className="absolute top-3 left-3 z-10">
        <Link to="/app/certificates">
          <Button size="sm" variant="secondary">Back</Button>
        </Link>
      </div>

      <div className="h-full w-full flex items-center justify-center">
        <CertificateDesign
          ref={certificateRef}
          fullName={fullName}
          courseName={courseName}
          teacherName={teacherName}
          courseCode={code}
          issueDate={issueDate}
          studentImage={user?.avatar}
          showDownloadButton={true}
        />
      </div>
    </div>
  );
};

export default CertificateView;


