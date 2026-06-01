import * as actions from '../App.actions';
import * as types from '../App.constants';
import API from '../../../api';
import { getUser, isFirstVisit, isLogged } from '../App.selectors';
import { updateIsInFreeCountry } from '../../../providers/SubscriptionProvider/SubscriptionProvider.actions';

jest.mock('../../../api', () => ({
  updateUser: jest.fn(),
}));

// 2. Mock external actions to return simple objects
jest.mock('../../../providers/SubscriptionProvider/SubscriptionProvider.actions', () => ({
  updateIsInFreeCountry: jest.fn(() => ({ type: 'MOCK_UPDATE_IS_IN_FREE_COUNTRY' })),
}));

describe('actions', () => {
  it('Checks selectors', () => {
    const state = {
      app: {
        userData: {
          email: 'test'
        },
        isFirstVisit: true
      }
    };
    const user = getUser(state);
    expect(user).toEqual(state.app.userData);
    const firstVisit = isFirstVisit(state);
    expect(firstVisit).toBeTruthy();
    const logged = isLogged(state);
    expect(logged).toBeTruthy();
  });
  it('should create an action to update display settings', () => {
    const payload = {};
    const expectedAction = {
      type: types.UPDATE_DISPLAY_SETTINGS,
      payload
    };
    expect(actions.updateDisplaySettings(payload)).toEqual(expectedAction);
  });

  it('should create an action to update display settings - default payload', () => {
    const expectedAction = {
      type: types.UPDATE_DISPLAY_SETTINGS,
      payload: {}
    };
    expect(actions.updateDisplaySettings()).toEqual(expectedAction);
  });

  it('should create an action to update navigation settings', () => {
    const payload = {};
    const expectedAction = {
      type: types.UPDATE_NAVIGATION_SETTINGS,
      payload
    };
    expect(actions.updateNavigationSettings(payload)).toEqual(expectedAction);
  });

  it('should create an action to update navigation settings - default payload', () => {
    const expectedAction = {
      type: types.UPDATE_NAVIGATION_SETTINGS,
      payload: {}
    };
    expect(actions.updateNavigationSettings()).toEqual(expectedAction);
  });

  it('should create an action to finish first user visit', () => {
    const expectedAction = {
      type: types.FINISH_FIRST_VISIT
    };
    expect(actions.finishFirstVisit()).toEqual(expectedAction);
  });
  describe('updateLoggedUserLocation thunk', () => {
    let dispatch;
    let getState;

    beforeEach(() => {
      // Reset mocks before each test
      dispatch = jest.fn();
      jest.clearAllMocks();

      // Spy on console.error to keep the test output clean and verify error handling
      jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
      console.error.mockRestore();
    });

    it('should exit early if userData is not present in state', async () => {
      getState = jest.fn(() => ({ app: { userData: null } }));

      const thunk = actions.updateLoggedUserLocation();
      await thunk(dispatch, getState);

      expect(dispatch).not.toHaveBeenCalled();
      expect(API.updateUser).not.toHaveBeenCalled();
    });

    it('should exit early if user already has a location', async () => {
      getState = jest.fn(() => ({
        app: {
          userData: { id: 'user-123', location: { country: 'US' } },
        },
      }));

      const thunk = actions.updateLoggedUserLocation();
      await thunk(dispatch, getState);

      expect(dispatch).not.toHaveBeenCalled();
      expect(API.updateUser).not.toHaveBeenCalled();
    });

    it('should fetch and update location if user has no location', async () => {
      const mockUserData = { id: 'user-123' };
      const mockLocationResponse = { country: 'BR', city: 'Sao Paulo' };

      getState = jest.fn(() => ({
        app: { userData: mockUserData },
      }));

      // Mock the successful API response
      API.updateUser.mockResolvedValue({ location: mockLocationResponse });

      const thunk = actions.updateLoggedUserLocation();
      await thunk(dispatch, getState);

      // Verify API was called correctly
      expect(API.updateUser).toHaveBeenCalledWith({
        id: mockUserData.id,
        location: {},
      });

      // Verify dispatches
      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(dispatch).toHaveBeenNthCalledWith(1, actions.updateUserData({
        ...mockUserData,
        location: mockLocationResponse,
      }));
      expect(dispatch).toHaveBeenNthCalledWith(2, updateIsInFreeCountry());
    });

    it('should log an error if the API returns without a location', async () => {
      getState = jest.fn(() => ({
        app: { userData: { id: 'user-123' } },
      }));

      // Mock API returning empty object (no location)
      API.updateUser.mockResolvedValue({});

      const thunk = actions.updateLoggedUserLocation();
      await thunk(dispatch, getState);

      expect(dispatch).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('error during localization of the logged user');
    });

    it('should catch and log an error if the API request fails', async () => {
      getState = jest.fn(() => ({
        app: { userData: { id: 'user-123' } },
      }));

      // Mock API rejection
      API.updateUser.mockRejectedValue(new Error('Network Error'));

      const thunk = actions.updateLoggedUserLocation();
      await thunk(dispatch, getState);

      expect(dispatch).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('error during localization of the logged user');
    });
  });
});
