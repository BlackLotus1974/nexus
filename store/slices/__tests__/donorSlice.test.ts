/**
 * Tests for Donor Redux Slice
 */

import donorReducer, {
  setSelectedDonor,
  setSearchQuery,
  setFilterCriteria,
  addToSearchHistory,
  clearSearchHistory,
  clearError,
  fetchDonors,
  fetchDonorById,
  createDonor,
  updateDonor,
  deleteDonor,
  searchDonors,
} from '../donorSlice';
import {
  createDonorState,
  createMockDonor,
  testDonors,
  resetIdCounter,
} from '@/lib/test/fixtures';

describe('donorSlice', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('reducers', () => {
    describe('setSelectedDonor', () => {
      it('should set the selected donor', () => {
        const initialState = createDonorState();
        const donor = createMockDonor();

        const nextState = donorReducer(initialState, setSelectedDonor(donor));

        expect(nextState.selectedDonor).toBe(donor);
      });

      it('should handle null to clear selection', () => {
        const donor = createMockDonor();
        const initialState = createDonorState({ selectedDonor: donor });

        const nextState = donorReducer(initialState, setSelectedDonor(null));

        expect(nextState.selectedDonor).toBeNull();
      });
    });

    describe('setSearchQuery', () => {
      it('should set the search query', () => {
        const initialState = createDonorState();

        const nextState = donorReducer(initialState, setSearchQuery('John'));

        expect(nextState.searchQuery).toBe('John');
      });

      it('should handle empty string', () => {
        const initialState = createDonorState({ searchQuery: 'John' });

        const nextState = donorReducer(initialState, setSearchQuery(''));

        expect(nextState.searchQuery).toBe('');
      });
    });

    describe('setFilterCriteria', () => {
      it('should set filter criteria', () => {
        const initialState = createDonorState();
        const criteria = {
          location: 'New York',
          hasRelationships: true,
        };

        const nextState = donorReducer(initialState, setFilterCriteria(criteria));

        expect(nextState.filterCriteria).toEqual(criteria);
      });

      it('should replace existing criteria', () => {
        const initialState = createDonorState({
          filterCriteria: { location: 'Boston' },
        });
        const newCriteria = { hasRelationships: false };

        const nextState = donorReducer(initialState, setFilterCriteria(newCriteria));

        expect(nextState.filterCriteria).toEqual(newCriteria);
        expect(nextState.filterCriteria.location).toBeUndefined();
      });
    });

    describe('addToSearchHistory', () => {
      it('should add new search to history', () => {
        const initialState = createDonorState();

        const nextState = donorReducer(initialState, addToSearchHistory('John Doe'));

        expect(nextState.searchHistory).toContain('John Doe');
        expect(nextState.searchHistory).toHaveLength(1);
      });

      it('should add to front of history', () => {
        const initialState = createDonorState({
          searchHistory: ['Jane Smith'],
        });

        const nextState = donorReducer(initialState, addToSearchHistory('John Doe'));

        expect(nextState.searchHistory[0]).toBe('John Doe');
        expect(nextState.searchHistory[1]).toBe('Jane Smith');
      });

      it('should not add duplicate entries', () => {
        const initialState = createDonorState({
          searchHistory: ['John Doe', 'Jane Smith'],
        });

        const nextState = donorReducer(initialState, addToSearchHistory('John Doe'));

        expect(nextState.searchHistory).toHaveLength(2);
        expect(nextState.searchHistory.filter((s) => s === 'John Doe')).toHaveLength(1);
      });

      it('should limit history to 10 entries', () => {
        const initialState = createDonorState({
          searchHistory: [
            'Search 1', 'Search 2', 'Search 3', 'Search 4', 'Search 5',
            'Search 6', 'Search 7', 'Search 8', 'Search 9', 'Search 10',
          ],
        });

        const nextState = donorReducer(initialState, addToSearchHistory('New Search'));

        expect(nextState.searchHistory).toHaveLength(10);
        expect(nextState.searchHistory[0]).toBe('New Search');
        expect(nextState.searchHistory).not.toContain('Search 10');
      });
    });

    describe('clearSearchHistory', () => {
      it('should clear all search history', () => {
        const initialState = createDonorState({
          searchHistory: ['John Doe', 'Jane Smith'],
        });

        const nextState = donorReducer(initialState, clearSearchHistory());

        expect(nextState.searchHistory).toHaveLength(0);
      });
    });

    describe('clearError', () => {
      it('should clear the error state', () => {
        const initialState = createDonorState({ error: 'Some error' });

        const nextState = donorReducer(initialState, clearError());

        expect(nextState.error).toBeNull();
      });
    });
  });

  describe('extraReducers', () => {
    describe('fetchDonors', () => {
      it('should set loading to true on pending', () => {
        const initialState = createDonorState();
        const action = { type: fetchDonors.pending.type };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(true);
        expect(nextState.error).toBeNull();
      });

      it('should set donors and lastFetch on fulfilled', () => {
        const initialState = createDonorState({ loading: true });
        const donors = testDonors;

        const action = {
          type: fetchDonors.fulfilled.type,
          payload: donors,
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.donors).toBe(donors);
        expect(nextState.lastFetch).toBeDefined();
        expect(typeof nextState.lastFetch).toBe('number');
      });

      it('should set error on rejected', () => {
        const initialState = createDonorState({ loading: true });
        const action = {
          type: fetchDonors.rejected.type,
          payload: 'Failed to fetch donors',
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.error).toBe('Failed to fetch donors');
      });
    });

    describe('fetchDonorById', () => {
      it('should set loading to true on pending', () => {
        const initialState = createDonorState();
        const action = { type: fetchDonorById.pending.type };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(true);
      });

      it('should set selectedDonor and update donors list on fulfilled', () => {
        const existingDonor = createMockDonor({ id: 'donor-1', name: 'Old Name' });
        const initialState = createDonorState({
          loading: true,
          donors: [existingDonor],
        });
        const updatedDonor = createMockDonor({ id: 'donor-1', name: 'New Name' });

        const action = {
          type: fetchDonorById.fulfilled.type,
          payload: updatedDonor,
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.selectedDonor).toBe(updatedDonor);
        expect(nextState.donors.find((d) => d.id === 'donor-1')?.name).toBe('New Name');
      });

      it('should add donor to list if not exists', () => {
        const initialState = createDonorState({
          loading: true,
          donors: [],
        });
        const newDonor = createMockDonor({ id: 'donor-new' });

        const action = {
          type: fetchDonorById.fulfilled.type,
          payload: newDonor,
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.donors).toHaveLength(1);
        expect(nextState.donors[0].id).toBe('donor-new');
      });

      it('should set error on rejected', () => {
        const initialState = createDonorState({ loading: true });
        const action = {
          type: fetchDonorById.rejected.type,
          payload: 'Donor not found',
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.error).toBe('Donor not found');
      });
    });

    describe('createDonor', () => {
      it('should add new donor to list on fulfilled', () => {
        const initialState = createDonorState({
          loading: true,
          donors: testDonors,
        });
        const newDonor = createMockDonor({ name: 'New Donor' });

        const action = {
          type: createDonor.fulfilled.type,
          payload: newDonor,
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.donors).toHaveLength(testDonors.length + 1);
        expect(nextState.donors[0].name).toBe('New Donor');
        expect(nextState.selectedDonor).toBe(newDonor);
      });
    });

    describe('updateDonor', () => {
      it('should update donor in list on fulfilled', () => {
        const donor = createMockDonor({ id: 'donor-1', name: 'Old Name' });
        const initialState = createDonorState({
          loading: true,
          donors: [donor],
          selectedDonor: donor,
        });
        const updatedDonor = { ...donor, name: 'Updated Name' };

        const action = {
          type: updateDonor.fulfilled.type,
          payload: updatedDonor,
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.donors[0].name).toBe('Updated Name');
        expect(nextState.selectedDonor?.name).toBe('Updated Name');
      });

      it('should not update selectedDonor if different donor', () => {
        const donor1 = createMockDonor({ id: 'donor-1', name: 'Donor 1' });
        const donor2 = createMockDonor({ id: 'donor-2', name: 'Donor 2' });
        const initialState = createDonorState({
          loading: true,
          donors: [donor1, donor2],
          selectedDonor: donor1,
        });
        const updatedDonor2 = { ...donor2, name: 'Updated Donor 2' };

        const action = {
          type: updateDonor.fulfilled.type,
          payload: updatedDonor2,
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.selectedDonor?.name).toBe('Donor 1');
        expect(nextState.donors.find((d) => d.id === 'donor-2')?.name).toBe('Updated Donor 2');
      });
    });

    describe('deleteDonor', () => {
      it('should remove donor from list on fulfilled', () => {
        const donor1 = createMockDonor({ id: 'donor-1' });
        const donor2 = createMockDonor({ id: 'donor-2' });
        const initialState = createDonorState({
          loading: true,
          donors: [donor1, donor2],
        });

        const action = {
          type: deleteDonor.fulfilled.type,
          payload: 'donor-1',
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.donors).toHaveLength(1);
        expect(nextState.donors[0].id).toBe('donor-2');
      });

      it('should clear selectedDonor if it was deleted', () => {
        const donor = createMockDonor({ id: 'donor-1' });
        const initialState = createDonorState({
          loading: true,
          donors: [donor],
          selectedDonor: donor,
        });

        const action = {
          type: deleteDonor.fulfilled.type,
          payload: 'donor-1',
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.selectedDonor).toBeNull();
      });

      it('should not clear selectedDonor if different donor deleted', () => {
        const donor1 = createMockDonor({ id: 'donor-1' });
        const donor2 = createMockDonor({ id: 'donor-2' });
        const initialState = createDonorState({
          loading: true,
          donors: [donor1, donor2],
          selectedDonor: donor1,
        });

        const action = {
          type: deleteDonor.fulfilled.type,
          payload: 'donor-2',
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.selectedDonor).toBe(donor1);
      });
    });

    describe('searchDonors', () => {
      it('should set donors and searchQuery on fulfilled', () => {
        const initialState = createDonorState({ loading: true });
        const donors = testDonors.slice(0, 2);

        const action = {
          type: searchDonors.fulfilled.type,
          payload: { donors, query: 'John' },
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.loading).toBe(false);
        expect(nextState.donors).toBe(donors);
        expect(nextState.searchQuery).toBe('John');
      });

      it('should add query to search history', () => {
        const initialState = createDonorState({
          loading: true,
          searchHistory: [],
        });

        const action = {
          type: searchDonors.fulfilled.type,
          payload: { donors: [], query: 'New Query' },
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.searchHistory).toContain('New Query');
      });

      it('should not add duplicate query to history', () => {
        const initialState = createDonorState({
          loading: true,
          searchHistory: ['Existing Query'],
        });

        const action = {
          type: searchDonors.fulfilled.type,
          payload: { donors: [], query: 'Existing Query' },
        };

        const nextState = donorReducer(initialState, action);

        expect(nextState.searchHistory.filter((q) => q === 'Existing Query')).toHaveLength(1);
      });
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = donorReducer(undefined, { type: 'unknown' });

      expect(state.donors).toEqual([]);
      expect(state.selectedDonor).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.filterCriteria).toEqual({});
      expect(state.searchHistory).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetch).toBeNull();
    });
  });
});
