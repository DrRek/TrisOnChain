pragma solidity ^0.4.24;

contract Tictac {
	
    event newProposedMatch(uint index, address indexed firstPlayer);
    event matchJoined(uint indexed index, address indexed proposer, address indexed opponent);
    event matchEnded(uint index, address winner, address loser, uint8[3][3] endTableStatus);
    event nextMove(uint index);
	
	struct Match{
    	address playerOne;
    	address playerTwo;
    	uint8 turno;
        uint8[3][3] table;
        bool isEnded;
	}

    Match[] public runningMatches;

	/* Questi mapping conterranno l'indice+1 della partita in corso di "address"
	 * E' sommato ad uno così da poter distinguere il return "0" quando nessun
	 * valore è stato mappato.
	 */
	mapping(address => uint) public matchIndexOfPlayers;
	
	function createMatch() public {
		require(senderIsNotPlaying());
	    uint8[3][3] memory emptyTable;
	    uint index = runningMatches.push(Match(msg.sender, 0x0, 2, emptyTable, false));
	    matchIndexOfPlayers[msg.sender] = index;
	    emit newProposedMatch(index, msg.sender);
	}

	/* Metodo utilizzato per joinare una partita proposta.
	 */
	function joinMatch(uint _id, address _proposer) public {
		// Controlliamo che chi vuole partecipare non sta già svolgendo o proponendo una partita
		// Controlliamo che la partita sia ancora effettivamente valida e disponibile
		require(senderIsNotPlaying() && isValidMatch(_id, _proposer) && isAvailableMatch(_id));
		// Giocatore 2 aggiunto alla partita
		runningMatches[_id - 1].playerTwo = msg.sender;
	    matchIndexOfPlayers[msg.sender] = _id;
		// Invio l'evento per aggiornare
	    emit matchJoined(_id, _proposer, msg.sender);
	}

	function play(uint _x, uint _y, uint _index) public{
		require(_x>=0 && _x<3 && _y>=0 && _y<3 && isHisTurn(_index));
		Match memory playingMatch = runningMatches[_index-1];
		require(!playingMatch.isEnded);
		if(playingMatch.table[_x][_y] == 0){
			if(playingMatch.playerOne == msg.sender){
				playingMatch.table[_x][_y] = 1;
				playingMatch.turno = 2;
			} else{
				playingMatch.table[_x][_y] = 2;
				playingMatch.turno = 1;
			}

			if(hasWin(playingMatch.table, _x, _y)){
				address loser;
				if(playingMatch.playerOne == msg.sender){
					loser = playingMatch.playerTwo;
				}else{
					loser = playingMatch.playerOne;
				}
				matchIndexOfPlayers[playingMatch.playerOne] = 0;
				matchIndexOfPlayers[playingMatch.playerTwo] = 0;
				emit matchEnded(_index, msg.sender, loser, playingMatch.table);
				playingMatch.isEnded = true;
			}else{
				emit nextMove(_index);
			}
			runningMatches[_index-1] = playingMatch;
		}
	}

	function getRunningMatchesCount() public view returns(uint){
		return runningMatches.length;
	}

	function getRunningMatchAtIndex(uint index) public view returns(uint, address, address, bool, uint) {
    	return (index, runningMatches[index-1].playerOne, runningMatches[index-1].playerTwo, runningMatches[index-1].isEnded, runningMatches[index-1].turno);
	}

	function getRunningMatchBoardAtIndex(uint index) public view returns(uint8[3][3]) {
    	return runningMatches[index-1].table;
	}

	function senderIsNotPlaying() view public returns(bool){
		return (matchIndexOfPlayers[msg.sender] == 0);
	}

	function isValidMatch(uint _index, address _proposer) view public returns(bool){
		return (matchIndexOfPlayers[_proposer] == _index);
	}

	function isAvailableMatch(uint _index) view public returns(bool){
		return (runningMatches[_index - 1].playerTwo == 0x0);
	}

	function isHisTurn(uint _index) view public returns(bool){
		return ((runningMatches[_index - 1].playerOne == msg.sender && runningMatches[_index - 1].turno == 1) || (runningMatches[_index - 1].playerTwo == msg.sender && runningMatches[_index - 1].turno == 2));
	}

	function hasWin(uint8[3][3] _table, uint _modifiedRow, uint _modifiedColumn) pure public returns(bool){
		if(_modifiedRow == _modifiedColumn){
			return (
					triEqual(_table[_modifiedRow][_modifiedColumn], _table[(_modifiedRow + 1) % 3][(_modifiedColumn + 1) % 3], _table[(_modifiedRow + 2) % 3][(_modifiedColumn + 2) % 3]) ||
					triEqual(_table[_modifiedRow][_modifiedColumn], _table[(_modifiedRow + 1) % 3][_modifiedColumn], _table[(_modifiedRow + 2) % 3][_modifiedColumn]) ||
					triEqual(_table[_modifiedRow][_modifiedColumn], _table[_modifiedRow][(_modifiedColumn + 1) % 3], _table[_modifiedRow][(_modifiedColumn + 2) % 3])
				);
		} else {
			return (
					triEqual(_table[_modifiedRow][_modifiedColumn], _table[(_modifiedRow + 1) % 3][_modifiedColumn], _table[(_modifiedRow + 2) % 3][_modifiedColumn]) ||
					triEqual(_table[_modifiedRow][_modifiedColumn], _table[_modifiedRow][(_modifiedColumn + 1) % 3], _table[_modifiedRow][(_modifiedColumn + 2) % 3])
				);
		}
	}

	function triEqual(uint8 _a, uint8 _b, uint8 _c) pure public returns (bool){
		return ((_a == _b) && (_a == _c));
	}
}