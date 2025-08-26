import React, { useEffect, useMemo, useState } from 'react';
import { coursesApi } from '@/api/courses';
import { Certificate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CertificatesPage: React.FC = () => {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [params] = useSearchParams();
  const targetCourseId = useMemo(() => Number(params.get('courseId')), [params]);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await coursesApi.getMyCertificates();
        setCerts(list);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) return <div className="h-40 bg-muted rounded" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Certificates</h1>
        <p className="text-sm text-muted-foreground mt-1">Your earned certificates</p>
      </div>

      {certs.length === 0 ? (
        <div className="text-sm text-muted-foreground">No certificates yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map((c) => (
            <Card key={c.id} className={targetCourseId && c.course.id === targetCourseId ? 'ring-2 ring-accent-neutral' : ''}>
              <CardHeader>
                <CardTitle className="text-base">{c.course.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>Issued: {new Date(c.issue_date).toLocaleDateString()}</div>
                <div>Code: {c.verification_code}</div>
                <div className="pt-2">
                  <Link to={`/app/certificates/${c.id}`}>
                    <Button size="sm" variant="secondary">View certificate</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CertificatesPage;


