/**
 * LISTE VIRTUALISÉE OPTIMISÉE
 * Rendu performant de grandes listes
 * 224Solutions - Virtualization System
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualization } from '@/hooks/usePerformanceOptimization';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  renderItem,
  className = '',
  onScroll,
  loading = false,
  emptyState
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop: setVirtualScrollTop
  } = useVirtualization(items, itemHeight, containerHeight, overscan);

  // Gestion du scroll avec throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    
    setScrollTop(newScrollTop);
    setVirtualScrollTop(newScrollTop);
    
    // Throttle les callbacks
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      onScroll?.(newScrollTop);
    }, 16); // ~60fps
  }, [onScroll, setVirtualScrollTop]);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // État vide
  if (items.length === 0 && !loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        {emptyState || (
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <div>Aucun élément à afficher</div>
          </div>
        )}
      </div>
    );
  }

  // État de chargement
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleItems.indexOf(item);
            return (
              <div
                key={actualIndex}
                style={{ height: itemHeight }}
                className="flex items-center"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook pour la pagination virtuelle
 */
export function useVirtualPagination<T>(
  allItems: T[],
  pageSize: number = 50,
  initialPage: number = 0
) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(allItems.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, allItems.length);
  
  const currentItems = useMemo(() => {
    return allItems.slice(startIndex, endIndex);
  }, [allItems, startIndex, endIndex]);

  const goToPage = useCallback(async (page: number) => {
    if (page < 0 || page >= totalPages) return;
    
    setIsLoading(true);
    
    // Simuler un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setCurrentPage(page);
    setIsLoading(false);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentItems,
    currentPage,
    totalPages,
    isLoading,
    goToPage,
    nextPage,
    prevPage,
    hasNext: currentPage < totalPages - 1,
    hasPrev: currentPage > 0
  };
}

/**
 * Composant de pagination
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  showInfo?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  showInfo = true
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(0, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisible);
      
      for (let i = start; i < end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
      {showInfo && (
        <div className="text-sm text-gray-700">
          Page {currentPage + 1} sur {totalPages}
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0 || isLoading}
          className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Précédent
        </button>
        
        {getPageNumbers().map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={isLoading}
            className={`px-3 py-1 text-sm border rounded ${
              page === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'hover:bg-gray-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {page + 1}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages - 1 || isLoading}
          className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

/**
 * Composant de liste avec pagination virtuelle
 */
interface VirtualizedListWithPaginationProps<T> extends VirtualizedListProps<T> {
  pageSize?: number;
  showPagination?: boolean;
}

export function VirtualizedListWithPagination<T>({
  items,
  pageSize = 50,
  showPagination = true,
  ...props
}: VirtualizedListWithPaginationProps<T>) {
  const {
    currentItems,
    currentPage,
    totalPages,
    isLoading,
    goToPage
  } = useVirtualPagination(items, pageSize);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <VirtualizedList
          {...props}
          items={currentItems}
          loading={isLoading}
        />
      </div>
      
      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
