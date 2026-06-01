import { mapStateToProps } from '../Board.container';
import { SYNC_STATUS } from '../Board.constants';
import React from 'react';
import { shallow } from 'enzyme';
import { BoardContainer } from '../Board.container';

jest.mock('ogv', () => ({ OGVLoader: { base: '' } }));
jest.mock('dom-to-image', () => ({}));
jest.mock('../Board.component', () => () => null);
jest.mock('../Board.messages', () => {
  const messages = new Proxy(
    {},
    {
      get: (_target, prop) => ({ id: String(prop) })
    }
  );

  return {
    __esModule: true,
    default: messages
  };
});

const createState = (boards, syncMeta = {}) => ({
  board: {
    boards,
    syncMeta,
    activeBoardId: null,
    output: [],
    navHistory: [],
    isLiveMode: false,
    improvedPhrase: null
  },
  communicator: {
    activeCommunicatorId: 'comm-1',
    communicators: [{ id: 'comm-1', boards: boards.map(b => b.id) }]
  },
  speech: {
    voices: [],
    options: { voiceURI: null, isCloud: false }
  },
  scanner: {},
  app: {
    displaySettings: {},
    navigationSettings: {},
    userData: null,
    isConnected: true,
    liveHelp: {
      isRootBoardTourEnabled: false,
      isSymbolSearchTourEnabled: false,
      isUnlockedTourEnabled: false
    }
  },
  language: { lang: 'en-US' },
  subscription: {
    premiumRequiredModalState: null,
    isInFreeCountry: true,
    isSubscribed: false,
    isOnTrialPeriod: false
  }
});

describe('Board.container', () => {
  describe('mapStateToProps', () => {
    describe('active board handling', () => {
      it('returns undefined for active board that is soft-deleted', () => {
        const boards = [{ id: 'board-1' }, { id: 'board-2' }];
        const syncMeta = {
          'board-2': { status: SYNC_STATUS.PENDING, isDeleted: true }
        };
        const state = {
          ...createState(boards, syncMeta),
          board: {
            ...createState(boards, syncMeta).board,
            activeBoardId: 'board-2'
          }
        };

        const props = mapStateToProps(state);

        expect(props.board).toBeUndefined();
      });

      // Note: Basic getVisibleBoards() filtering logic is tested in Board.selectors.test.js
      // This test covers the container-specific behavior: board: getVisibleBoards(state).find(board => board.id === activeBoardId)
    });
  });

  describe('componentDidMount', () => {
    let dispatchAndRouterProps;

    beforeEach(() => {
      dispatchAndRouterProps = {
        changeBoard: jest.fn(),
        history: { replace: jest.fn(), push: jest.fn() },
        location: { search: '' },
        intl: {
          formatMessage: jest.fn(() => 'mocked_text')
        }
      };
    });

    it('id is equal to active board', async () => {
      const boards = [{ id: 'b1', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = 'b1';

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: 'b1' } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      await instance.componentDidMount();

      expect(props.changeBoard).toHaveBeenCalledWith('b1');
      expect(props.history.replace).toHaveBeenCalledWith('b1');
    });

    it('id different from active board, requested board is not available locally, tryRemoteBoard returns valid board', async () => {
      const boards = [{ id: 'b1', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = 'b1';

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: 'b2' } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      // tryRemoteBoard mock returns valid remoteBoard
      jest
        .spyOn(instance, 'tryRemoteBoard')
        .mockResolvedValue({ id: 'b2', isFixed: false });

      await instance.componentDidMount();

      expect(instance.tryRemoteBoard).toHaveBeenCalledWith('b2');
      expect(props.changeBoard).toHaveBeenCalledWith('b2');
      expect(props.history.replace).toHaveBeenCalledWith('b2');
    });

    it('id different from active board, requested board is not available locally, tryRemoteBoard returns null, fallback to active board', async () => {
      const boards = [{ id: 'b1', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = 'b1';

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: 'b2' } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      // tryRemoteBoard mock returns null
      jest.spyOn(instance, 'tryRemoteBoard').mockResolvedValue(null);

      await instance.componentDidMount();

      expect(instance.tryRemoteBoard).toHaveBeenCalledWith('b2');
      // Assert returns to previous board ('b1')
      expect(props.changeBoard).toHaveBeenCalledWith('b1');
    });

    it('id different from active board, board available locally', async () => {
      const boards = [
        { id: 'b1', isFixed: false },
        { id: 'b2', isFixed: false }
      ];
      const state = createState(boards);
      state.board.activeBoardId = 'b1';

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: 'b2' } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      await instance.componentDidMount();

      // Finds b2 locally
      expect(props.changeBoard).toHaveBeenCalledWith('b2');
    });

    it('No active board, requested id not available locally, tryRemoteBoard returns requested board', async () => {
      const boards = [{ id: 'b1', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = null;

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: 'b2' } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      // mock returns remote board
      jest
        .spyOn(instance, 'tryRemoteBoard')
        .mockResolvedValue({ id: 'b2', isFixed: false });

      await instance.componentDidMount();

      expect(props.changeBoard).toHaveBeenCalledWith('b2');
    });

    it('No active board, requested id is available locally', async () => {
      const boards = [{ id: 'b2', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = null;

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: 'b2' } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      await instance.componentDidMount();

      expect(props.changeBoard).toHaveBeenCalledWith('b2');
    });

    it('Requested id is undefined, returns to active board', async () => {
      const boards = [{ id: 'b1', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = 'b1';

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: undefined } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      await instance.componentDidMount();

      expect(props.changeBoard).toHaveBeenCalledWith('b1');
      // adapts path to return correctly
      expect(props.history.replace).toHaveBeenCalledWith('board/b1');
    });

    it('No id and no active board, fails to return rootBoard, returns any board', async () => {
      const boards = [{ id: 'random_board', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = null;

      state.communicator.communicators[0].rootBoard = null;

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: undefined } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      await instance.componentDidMount();

      // Fallback to first available board
      expect(props.changeBoard).toHaveBeenCalledWith('random_board');
      expect(props.history.replace).toHaveBeenCalledWith('board/random_board');
    });

    it('Error on tryRemoteBoard with active board (Catch 1)', async () => {
      // 1. Setup: b1 is active board, tries to access b2
      const boards = [{ id: 'b1', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = 'b1';

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: 'b2' } }
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      // 2. mock api failing
      jest
        .spyOn(instance, 'tryRemoteBoard')
        .mockRejectedValue(new Error('API unavailable'));

      await instance.componentDidMount();

      // 3. Verifies if the catch handled the error
      expect(instance.tryRemoteBoard).toHaveBeenCalledWith('b2');
      expect(props.changeBoard).toHaveBeenCalledWith('b1');
    });

    it('Error on tryRemoteBoard with no active board (Catch 2)', async () => {
      // 1. Setup: Only rootBoard available
      const boards = [{ id: 'root_board', isFixed: false }];
      const state = createState(boards);
      state.board.activeBoardId = null;

      // Sets up to return rootBoard
      state.communicator.communicators[0].rootBoard = 'root_board';

      const props = {
        ...mapStateToProps(state),
        ...dispatchAndRouterProps,
        match: { params: { id: 'b2' } } // Trying to access 'b2'
      };

      const wrapper = shallow(<BoardContainer {...props} />, {
        disableLifecycleMethods: true
      });
      const instance = wrapper.instance();

      // 2. Mock api failing
      jest
        .spyOn(instance, 'tryRemoteBoard')
        .mockRejectedValue(new Error('API Timeout'));

      await instance.componentDidMount();

      // 3. Verifies if tried remote and correctly returned rootBoard
      expect(instance.tryRemoteBoard).toHaveBeenCalledWith('b2');
      expect(props.changeBoard).toHaveBeenCalledWith('root_board');
      expect(props.history.replace).toHaveBeenCalledWith('root_board');
    });
  });
});
