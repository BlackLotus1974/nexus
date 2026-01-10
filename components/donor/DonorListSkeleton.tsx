'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function DonorListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card padding={false}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="w-12 px-6 py-3">
                <Skeleton variant="rectangular" width="16px" height="16px" />
              </th>
              <th className="px-6 py-3">
                <Skeleton variant="text" width="60px" />
              </th>
              <th className="px-6 py-3">
                <Skeleton variant="text" width="80px" />
              </th>
              <th className="px-6 py-3">
                <Skeleton variant="text" width="100px" />
              </th>
              <th className="px-6 py-3">
                <Skeleton variant="text" width="60px" />
              </th>
              <th className="px-6 py-3">
                <Skeleton variant="text" width="60px" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: count }).map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <Skeleton variant="rectangular" width="16px" height="16px" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton variant="text" width="150px" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton variant="text" width="120px" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton variant="text" width="100px" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton variant="rectangular" width="80px" height="24px" className="rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 justify-end">
                    <Skeleton variant="rectangular" width="60px" height="32px" />
                    <Skeleton variant="rectangular" width="60px" height="32px" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function DonorGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between mb-3">
            <Skeleton variant="text" width="150px" height="24px" />
            <Skeleton variant="rectangular" width="80px" height="24px" className="rounded-full" />
          </div>
          <Skeleton variant="text" width="120px" className="mb-4" />
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <Skeleton variant="text" width="100px" />
            <Skeleton variant="rectangular" width="80px" height="32px" />
          </div>
        </Card>
      ))}
    </div>
  );
}
