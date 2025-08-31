import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

type BackButtonProps = {
  to?: string;
  label?: string;
  className?: string;
};

const BackButton: React.FC<BackButtonProps> = ({ to, label = 'Back', className }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
      return;
    }
    navigate(-1);
  };

  return (
    <Button variant="outline" className={className} onClick={handleClick} aria-label={label}>
      {label}
    </Button>
  );
};

export default BackButton;


