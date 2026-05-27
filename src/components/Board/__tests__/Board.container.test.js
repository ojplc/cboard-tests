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
    describe('MC/DC', () => {
      let changeBoardMock;
      let historyReplaceMock;
      let baseProps;

      beforeEach(() => {
        changeBoardMock = jest.fn();
        historyReplaceMock = jest.fn();

        baseProps = {
          navHistory: [],
          intl: {
            formatMessage: jest.fn(message => message?.id || '')
          },
          boards: [
            { id: 'b1', isFixed: false },
            { id: 'b2', isFixed: false },
            { id: 'root-id', isFixed: true }
          ],
          communicator: {
            rootBoard: 'root-id',
            boards: ['b1', 'b2', 'root-id']
          },
          changeBoard: changeBoardMock,
          addBoardCommunicator: jest.fn(),
          history: { replace: historyReplaceMock }
        };
      });

      it('TC1 Must return active board when id from request is equal to active board', async () => {
        const props = {
          ...baseProps,
          match: { params: { id: 'b1' } },
          board: { id: 'b1' }
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(changeBoardMock).toHaveBeenCalledWith('b1');
        expect(historyReplaceMock).toHaveBeenCalledWith('b1');
      });

      it('TC2 Must GET board when id is different from active board', async () => {
        const props = {
          ...baseProps,
          match: { params: { id: 'b2' } },
          board: { id: 'b1' } // Active board is different from id
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        // Found 'b2' in local board list
        expect(changeBoardMock).toHaveBeenCalledWith('b2');
        expect(historyReplaceMock).toHaveBeenCalledWith('b2');
      });

      it('TC3 Must use GET board from id when there is no active board', async () => {
        const props = {
          ...baseProps,
          match: { params: { id: 'b2' } },
          board: null // No active board
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(changeBoardMock).toHaveBeenCalledWith('b2');
        expect(historyReplaceMock).toHaveBeenCalledWith('b2');
      });

      it('TC4 Must use active board when there is no id in the request', async () => {
        const props = {
          ...baseProps,
          match: { params: {} }, // No ID
          board: { id: 'b1' }
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(changeBoardMock).toHaveBeenCalledWith('b1');
        expect(historyReplaceMock).toHaveBeenCalledWith('board/b1');
      });

      it('TC5 Must use rootBoard when there is no id in the route and no active board', async () => {
        const props = {
          ...baseProps,
          match: { params: {} },
          board: null
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(changeBoardMock).toHaveBeenCalledWith('root-id');
        expect(historyReplaceMock).toHaveBeenCalledWith('board/root-id');
        expect(wrapper.state('isFixedBoard')).toBe(true);
      });
    });

    describe('Black box', () => {
      let changeBoardMock;
      let historyReplaceMock;
      let baseProps;
      let tryRemoteBoardSpy;

      beforeEach(() => {
        changeBoardMock = jest.fn();
        historyReplaceMock = jest.fn();

        // Spy funtion tryRemoteBoard to simulate API response
        tryRemoteBoardSpy = jest.spyOn(
          BoardContainer.prototype,
          'tryRemoteBoard'
        );

        baseProps = {
          navHistory: [],
          intl: {
            formatMessage: jest.fn(message => message?.id || '')
          },
          boards: [
            { id: 'b1', isFixed: false },
            { id: 'b2', isFixed: false },
            { id: 'root-id', isFixed: true }
          ],
          communicator: {
            rootBoard: 'root-id',
            boards: ['b1', 'b2', 'root-id']
          },
          changeBoard: changeBoardMock,
          addBoardCommunicator: jest.fn(),
          history: { replace: historyReplaceMock }
        };
      });

      afterEach(() => {
        // Clean mock after each test
        tryRemoteBoardSpy.mockRestore();
      });

      it('BB1 - Found remote board correctly must download it and display it', async () => {
        // Mock: tryRemoteBoard returns a valid object
        tryRemoteBoardSpy.mockResolvedValue({ id: 'remote', isFixed: false });

        const props = {
          ...baseProps,
          match: { params: { id: 'remote' } }, // id = 'remote'
          board: null
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(tryRemoteBoardSpy).toHaveBeenCalledWith('remote');
        expect(changeBoardMock).toHaveBeenCalledWith('remote');
        expect(historyReplaceMock).toHaveBeenCalledWith('remote');
      });

      it('BB2 - Remote board does not exist, return to active board', async () => {
        // Mock: tryRemoteBoard throws an error
        tryRemoteBoardSpy.mockRejectedValue(new Error('404 Not Found'));

        const props = {
          ...baseProps,
          match: { params: { id: 'invalid' } }, 
          board: { id: 'b1' } // Active board
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(tryRemoteBoardSpy).toHaveBeenCalledWith('invalid');
        // Redirects to active board
        expect(changeBoardMock).toHaveBeenCalledWith('b1');
        expect(historyReplaceMock).toHaveBeenCalledWith('b1');
      });

      it('BB3 - Remote board does not exist and there is no active board, return RootBoard', async () => {
        // Mock: tryRemoteBoard throws error
        tryRemoteBoardSpy.mockRejectedValue(new Error('404 Not Found'));

        const props = {
          ...baseProps,
          match: { params: { id: 'invalid' } }, // id = 'invalid'
          board: null // No active board
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(tryRemoteBoardSpy).toHaveBeenCalledWith('invalid');
        // Points to rootBoard
        expect(changeBoardMock).toHaveBeenCalledWith('root-id');
        expect(historyReplaceMock).toHaveBeenCalledWith('root-id');
      });

      it('BB4 - Remote board does not exist, no active board and no rootBoard, return any board', async () => {
        const props = {
          ...baseProps,
          match: { params: {} }, // No ID
          board: null, // No active
          boards: [{ id: 'survival', isFixed: false }], // Only one survival on the list
          communicator: {
            rootBoard: 'deleted' // Root board does not exist in local array
          }
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        // Fetches first available board
        expect(changeBoardMock).toHaveBeenCalledWith('survival');
        expect(historyReplaceMock).toHaveBeenCalledWith('board/survival');
      });
    });

    describe('Extra cases', () => {
      let changeBoardMock;
      let historyReplaceMock;
      let baseProps;
      let tryRemoteBoardSpy;

      beforeEach(() => {
        changeBoardMock = jest.fn();
        historyReplaceMock = jest.fn();
        tryRemoteBoardSpy = jest.spyOn(
          BoardContainer.prototype,
          'tryRemoteBoard'
        );

        baseProps = {
          navHistory: [],
          intl: {
            formatMessage: jest.fn(message => message?.id || '')
          },
          boards: [
            { id: 'b1', isFixed: false },
            { id: 'b2', isFixed: false },
            { id: 'root-id', isFixed: true }
          ],
          communicator: {
            rootBoard: 'root-id',
            boards: ['b1', 'b2', 'root-id']
          },
          changeBoard: changeBoardMock,
          addBoardCommunicator: jest.fn(),
          history: { replace: historyReplaceMock }
        };
      });

      afterEach(() => {
        tryRemoteBoardSpy.mockRestore();
      });

      it('D2 Return correctly remote board even when there is an active board', async () => {
        // Mock: tryRemoteBoard retorna o objeto da prancha com sucesso
        tryRemoteBoardSpy.mockResolvedValue({ id: 'remote', isFixed: false });

        const props = {
          ...baseProps,
          match: { params: { id: 'remote' } }, // ID on route
          board: { id: 'b1' }, // Active board is different from route
          boards: [{ id: 'b1' }] // Remote board is not saved locally
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(tryRemoteBoardSpy).toHaveBeenCalledWith('remote');
        // fall to 'if (remoteBoard)'
        expect(changeBoardMock).toHaveBeenCalledWith('remote');
        expect(historyReplaceMock).toHaveBeenCalledWith('remote');
      });

      it('D2 Must return to active board when tryRemoteBoard returns null', async () => {
        // Mock: tryRemoteBoard resolves Promise, but returns null for testing
        tryRemoteBoardSpy.mockResolvedValue(null);

        const props = {
          ...baseProps,
          match: { params: { id: 'remote' } }, // ID on route
          board: { id: 'b1' }, // Active board different from route
          boards: [{ id: 'b1' }] // Remote board is not saved locally
        };

        const wrapper = shallow(<BoardContainer {...props} />, {
          disableLifecycleMethods: true
        });
        await wrapper.instance().componentDidMount();

        expect(tryRemoteBoardSpy).toHaveBeenCalledWith('remote');
        // tryRemoteBoard returned null -> fall to else case and returns to previous board
        expect(changeBoardMock).toHaveBeenCalledWith('b1');
        expect(historyReplaceMock).toHaveBeenCalledWith('b1');
      });
    });
  });
});
