import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Power, Eye } from 'lucide-react';

interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  bgColor: string;
  textColor?: string;
  ariaLabel: string;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onDetail?: () => void;
  onToggle?: () => void;
  isToggled?: boolean; // e.g. product.is_active
  toggleLabel?: string;
  customActions?: SwipeAction[];
  className?: string;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onEdit,
  onDelete,
  onDetail,
  onToggle,
  isToggled = true,
  customActions,
  className = '',
}) => {
  const [translateX, setTranslateX] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prepare right actions
  const actions: SwipeAction[] = customActions || [];

  if (!customActions) {
    if (onDetail) {
      actions.push({
        label: 'Detail',
        icon: <Eye className="w-4 h-4" />,
        onClick: onDetail,
        bgColor: 'bg-stone-700 active:bg-stone-800',
        textColor: 'text-white',
        ariaLabel: 'Lihat Detail',
      });
    }

    if (onToggle) {
      actions.push({
        label: isToggled ? 'Nonaktif' : 'Aktifkan',
        icon: <Power className="w-4 h-4" />,
        onClick: onToggle,
        bgColor: isToggled
          ? 'bg-amber-600 active:bg-amber-700'
          : 'bg-emerald-600 active:bg-emerald-700',
        textColor: 'text-white',
        ariaLabel: isToggled ? 'Nonaktifkan' : 'Aktifkan',
      });
    }

    if (onEdit) {
      actions.push({
        label: 'Edit',
        icon: <Edit2 className="w-4 h-4" />,
        onClick: onEdit,
        bgColor: 'bg-[#C58940] active:bg-[#B37830]',
        textColor: 'text-white',
        ariaLabel: 'Edit Item',
      });
    }

    if (onDelete) {
      actions.push({
        label: 'Hapus',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: onDelete,
        bgColor: 'bg-rose-600 active:bg-rose-700',
        textColor: 'text-white',
        ariaLabel: 'Hapus Item',
      });
    }
  }

  // Width of each button is ~64px, so total max swipe offset is:
  const actionButtonWidth = 64;
  const maxOffset = actions.length * actionButtonWidth;

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    currentXRef.current = startXRef.current;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - startXRef.current;
    const diffY = touchY - startYRef.current;

    // Detect gesture direction after slight movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // If it's a horizontal swipe, prevent standard scrolling and animate
    if (isHorizontalSwipeRef.current) {
      currentXRef.current = touchX;
      let newX = isOpen ? -maxOffset + diffX : diffX;

      // Bound between -maxOffset (with resistance) and 0 (with resistance)
      if (newX < -maxOffset) {
        const extra = -maxOffset - newX;
        newX = -maxOffset - Math.sqrt(extra) * 3;
      } else if (newX > 0) {
        newX = Math.sqrt(newX) * 3;
      }

      setTranslateX(newX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (!isHorizontalSwipeRef.current) {
      // If was just a tap and open, close it
      if (isOpen && Math.abs(translateX) > 0) {
        closeSwipe();
      }
      return;
    }

    const threshold = maxOffset * 0.4;

    if (translateX < -threshold) {
      // Snap open
      setTranslateX(-maxOffset);
      setIsOpen(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } else {
      // Snap closed
      closeSwipe();
    }
  };

  const closeSwipe = () => {
    setTranslateX(0);
    setIsOpen(false);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if (isOpen) {
      e.stopPropagation();
      closeSwipe();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl select-none ${className}`}
    >
      {/* Background action tray (revealed on swipe left) */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch z-0"
        style={{ width: `${maxOffset}px` }}
      >
        {actions.map((act, index) => (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeSwipe();
              act.onClick();
            }}
            aria-label={act.ariaLabel}
            className={`flex-1 flex flex-col items-center justify-center gap-1 ${act.bgColor} ${
              act.textColor || 'text-white'
            } transition active:scale-95 text-[11px] font-bold shadow-inner`}
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      {/* Foreground card content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleContentClick}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        className="relative z-10 w-full bg-white will-change-transform"
      >
        {children}
      </div>
    </div>
  );
};
