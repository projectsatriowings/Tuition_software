import React from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuthenticatedMedia } from '../hooks/useAuthenticatedMedia';

interface AuthImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackClassName?: string;
}

/**
 * Renders an <img> whose source requires JWT Bearer authentication by loading
 * it into a local blob URL.
 */
export const AuthImage: React.FC<AuthImageProps> = ({
  src,
  alt = 'Attachment',
  className = '',
  fallbackClassName = '',
  ...rest
}) => {
  const { blobUrl, loading, error } = useAuthenticatedMedia(src);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-[#EFEBE9]/70 text-[#8D6E63] min-h-[100px] min-w-[140px] rounded-xl ${fallbackClassName}`}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-[#EFEBE9]/70 text-[#8D6E63] p-4 min-h-[90px] min-w-[140px] rounded-xl text-[11px] ${fallbackClassName}`}
      >
        <ImageIcon className="w-5 h-5 opacity-70" />
        <span>Image unavailable</span>
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} {...rest} />;
};
