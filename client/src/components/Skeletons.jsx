import React from 'react';

// 1. The Base Skeleton Block (with the custom shimmer effect)
export const SkeletonBase = ({ className }) => (
  <div className={`relative overflow-hidden bg-slate-200 rounded-md ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
  </div>
);

// 2. Workspace Page Skeleton (3 section blocks × 3 task rows)
export const WorkspaceSkeleton = () => {
  return (
    <div className="w-full animate-pulse-fast">
      {/* Workspace Header Skeleton */}
      <div className="mb-8">
        <SkeletonBase className="h-8 w-64 mb-3" />
        <SkeletonBase className="h-4 w-96" />
      </div>

      {/* 3 Section Blocks */}
      <div className="space-y-6">
        {[1, 2, 3].map((sectionId) => (
          <div key={sectionId} className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
            {/* Section Title */}
            <SkeletonBase className="h-6 w-32 mb-3" />
            
            {/* 3 Task Rows */}
            <div className="space-y-1">
              {[1, 2, 3].map((rowId) => (
                <div key={rowId} className="h-[42px] bg-white rounded-md border border-slate-100 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 w-full">
                    <SkeletonBase className="h-5 w-5 rounded-full flex-shrink-0" />
                    <SkeletonBase className="h-4 w-3/4 sm:w-1/2" />
                  </div>
                  {/* Fake metadata chips on right */}
                  <div className="hidden sm:flex gap-2">
                    <SkeletonBase className="h-5 w-16 rounded-full" />
                    <SkeletonBase className="h-5 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. Sidebar Workspace List Skeleton
export const SidebarListSkeleton = () => {
  return (
    <div className="space-y-2 mt-2 px-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2 p-2">
          <SkeletonBase className="h-4 w-4 rounded-sm" />
          <SkeletonBase className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
};

// 4. Task Detail Panel Skeleton
export const TaskDetailSkeleton = () => {
  return (
    <div className="p-4 space-y-6">
      {/* Title Field */}
      <SkeletonBase className="h-8 w-full mb-2" />
      <SkeletonBase className="h-8 w-2/3" />
      
      {/* Metadata Fields (Priority, Due Date, Tags) */}
      <div className="space-y-4 py-4 border-y border-slate-100">
        <div className="flex items-center gap-4">
          <SkeletonBase className="h-5 w-20" />
          <SkeletonBase className="h-8 w-32 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <SkeletonBase className="h-5 w-20" />
          <SkeletonBase className="h-8 w-40 rounded-md" />
        </div>
      </div>

      {/* Description / Rich Text Area */}
      <div className="space-y-2 mt-6">
        <SkeletonBase className="h-4 w-full" />
        <SkeletonBase className="h-4 w-full" />
        <SkeletonBase className="h-4 w-5/6" />
        <SkeletonBase className="h-4 w-4/5" />
      </div>
    </div>
  );
};