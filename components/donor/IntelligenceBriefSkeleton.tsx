'use client';

import React from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

export function IntelligenceBriefSkeleton() {
  return (
    <Card padding={false}>
      <CardHeader className="px-6 pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton variant="text" width="250px" height="32px" className="mb-2" />
            <Skeleton variant="text" width="150px" />
          </div>
          <Skeleton variant="rectangular" width="120px" height="36px" />
        </div>
        <div className="mt-4">
          <Skeleton variant="text" width="200px" />
        </div>
      </CardHeader>

      <CardBody className="px-6 pb-6">
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <Skeleton variant="text" width="120px" height="24px" className="mb-4" />
            <SkeletonText lines={3} />
          </div>

          {/* Section 2 */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <Skeleton variant="text" width="150px" height="24px" className="mb-4" />
            <div className="flex flex-wrap gap-2">
              <Skeleton variant="rectangular" width="80px" height="28px" className="rounded-full" />
              <Skeleton variant="rectangular" width="100px" height="28px" className="rounded-full" />
              <Skeleton variant="rectangular" width="90px" height="28px" className="rounded-full" />
            </div>
          </div>

          {/* Section 3 */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <Skeleton variant="text" width="180px" height="24px" className="mb-4" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Skeleton variant="text" width="200px" className="mb-2" />
                  <Skeleton variant="text" width="150px" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4 */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <Skeleton variant="text" width="200px" height="24px" className="mb-4" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Skeleton variant="text" width="180px" className="mb-2" />
                  <Skeleton variant="text" width="120px" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 5 */}
          <div>
            <Skeleton variant="text" width="220px" height="24px" className="mb-4" />
            <SkeletonText lines={2} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
