const Tictac = artifacts.require("Tictac");

contract('Test del contratto per il gioco del tris', async(accounts) => {

	it("Test createMatch()", async() => {
		let depl = await Tictac.deployed();

		//Mi assicuro che viene creata la partita
		await depl.createMatch({from: accounts[0]});
		let indexOfRealMatch = await depl.matchIndexOfPlayers(accounts[0]);
		assert.equal(1, indexOfRealMatch);

		//Mi assicuro che se ho una partita già creata non ne posso creare un'altra
		try {
		    await depl.createMatch({from: accounts[0]});
		    assert.fail('Expected revert not received');
		  } catch (error) {
		    const revertFound = error.message.search('revert') >= 0;
		    assert(revertFound, 'Expected "revert", got '+error+' instead');
		}

		//Controllo che il rispettivo player associato alla partita è quello giusto
		let match = await depl.runningMatches(indexOfRealMatch-1); //L'index deve sempre essere meno uno quando non si lavora con le funzioni
		assert.equal(accounts[0], match[0]);
		assert.equal(0x0, match[1]);
		assert.equal(2, match[2]);
		assert(!match[3])
		let actualTable = await depl.getRunningMatchBoardAtIndex(indexOfRealMatch);
		let emptyMatrix = [[0, 0, 0],[0, 0, 0],[0, 0, 0],];
		assert(compareMatrix(actualTable, emptyMatrix), "Il tavolo da gioco non è composto come previsto");
	})

	it("Test joinMatch()", async() => {
		let depl = await Tictac.deployed();

		let alreadyProposingTheSameMatch = accounts[0];
		let successfulJoiner = accounts[1];
		let alreadyProposingOtherMatch = accounts[2];
		let theOneWhoTryToJoinANotJoinableMatch = accounts[3];

		//La stessa persona che sta proponendo non deve poter far parte dello stesso match
		try {
		    await depl.joinMatch(1, alreadyProposingTheSameMatch, {from: alreadyProposingTheSameMatch});
		    assert.fail('Expected revert not received');
		  } catch (error) {
		    const revertFound = error.message.search('revert') >= 0;
		    assert(revertFound, 'Expected "revert", got '+error+' instead');
		}

		//Una persona che propone un'altra partita non deve poter giocare
		await depl.createMatch({from: alreadyProposingOtherMatch});
		try {
		    await depl.joinMatch(1, alreadyProposingTheSameMatch, {from: alreadyProposingOtherMatch});
		    assert.fail('Expected revert not received');
		  } catch (error) {
		    const revertFound = error.message.search('revert') >= 0;
		    assert(revertFound, 'Expected "revert", got '+error+' instead');
		}

		//Una persona che non sta proponendo può joinare
		await depl.joinMatch(1, alreadyProposingTheSameMatch, {from: successfulJoiner});
		let match = await depl.runningMatches(0); //L'index deve sempre essere meno uno quando non si lavora con le funzioni
		assert.equal(alreadyProposingTheSameMatch, match[0]);
		assert.equal(successfulJoiner, match[1]);
		assert.equal(2, match[2]);
		assert(!match[3])
		let actualTable = await depl.getRunningMatchBoardAtIndex(1);
		let emptyMatrix = [[0, 0, 0],[0, 0, 0],[0, 0, 0],];
		assert(compareMatrix(actualTable, emptyMatrix), "Il tavolo da gioco non è composto come previsto");	

		//Evito che una persona possa joinare una partita in corso
		try {
			await depl.joinMatch(1, alreadyProposingTheSameMatch, {from: theOneWhoTryToJoinANotJoinableMatch});
		    assert.fail('Expected revert not received');
		  } catch (error) {
		    const revertFound = error.message.search('revert') >= 0;
		    assert(revertFound, 'Expected "revert", got '+error+' instead');
		}
	})

	it("Test play()", async() => {
		let depl = await Tictac.deployed();

		let playerOne = accounts[0];
		let playerTwo = accounts[1]; //Primo turno a lui

		//Provo a fare una mossa anche se non è il mio turno
		try {
			await depl.play(0, 0, 1, {from: playerOne});
		    assert.fail('Expected revert not received');
		  } catch (error) {
		    const revertFound = error.message.search('revert') >= 0;
		    assert(revertFound, 'Expected "revert", got '+error+' instead');
		}

		//Provo a fare una mossa valida
		await depl.play(0, 0, 1, {from: playerTwo});
		let match = await depl.runningMatches(0); //L'index deve sempre essere meno uno quando non si lavora con le funzioni
		assert.equal(playerOne, match[0]);
		assert.equal(playerTwo, match[1]);
		assert.equal(1, match[2]); //A chi tocca ora
		assert(!match[3])
		let actualTable = await depl.getRunningMatchBoardAtIndex(1);
		let emptyMatrix = [[2, 0, 0],[0, 0, 0],[0, 0, 0],];
		assert(compareMatrix(actualTable, emptyMatrix), "Il tavolo da gioco non è composto come previsto");	

		//Anche se è il mio turno provo a selezionare una casella già selezionata
		try {
			await depl.play(0, 0, 1, {from: playerTwo});
		    assert.fail('Expected revert not received');
		  } catch (error) {
		    const revertFound = error.message.search('revert') >= 0;
		    assert(revertFound, 'Expected "revert", got '+error+' instead');
		}

		//Continuo a giocare fino alla fine della partita
		await depl.play(0, 2, 1, {from: playerOne});
		match = await depl.runningMatches(0); //L'index deve sempre essere meno uno quando non si lavora con le funzioni
		assert.equal(playerOne, match[0]);
		assert.equal(playerTwo, match[1]);
		assert.equal(2, match[2]); //A chi tocca ora
		assert(!match[3])
		actualTable = await depl.getRunningMatchBoardAtIndex(1);
		emptyMatrix = [[2, 0, 1],[0, 0, 0],[0, 0, 0],];
		assert(compareMatrix(actualTable, emptyMatrix), "Il tavolo da gioco non è composto come previsto");	

		await depl.play(1, 0, 1, {from: playerTwo});
		match = await depl.runningMatches(0); //L'index deve sempre essere meno uno quando non si lavora con le funzioni
		assert.equal(playerOne, match[0]);
		assert.equal(playerTwo, match[1]);
		assert.equal(1, match[2]); //A chi tocca ora
		assert(!match[3])
		actualTable = await depl.getRunningMatchBoardAtIndex(1);
		emptyMatrix = [[2, 0, 1],[2, 0, 0],[0, 0, 0],];
		assert(compareMatrix(actualTable, emptyMatrix), "Il tavolo da gioco non è composto come previsto");	

		await depl.play(1, 2, 1, {from: playerOne});
		match = await depl.runningMatches(0); //L'index deve sempre essere meno uno quando non si lavora con le funzioni
		assert.equal(playerOne, match[0]);
		assert.equal(playerTwo, match[1]);
		assert.equal(2, match[2]); //A chi tocca ora
		assert(!match[3])
		actualTable = await depl.getRunningMatchBoardAtIndex(1);
		emptyMatrix = [[2, 0, 1],[2, 0, 1],[0, 0, 0],];
		assert(compareMatrix(actualTable, emptyMatrix), "Il tavolo da gioco non è composto come previsto");	

		await depl.play(2, 0, 1, {from: playerTwo});
		match = await depl.runningMatches(0); //L'index deve sempre essere meno uno quando non si lavora con le funzioni
		assert.equal(playerOne, match[0]);
		assert.equal(playerTwo, match[1]);
		assert.equal(1, match[2]); //A chi tocca ora
		assert(match[3])
		actualTable = await depl.getRunningMatchBoardAtIndex(1);
		emptyMatrix = [[2, 0, 1],[2, 0, 1],[2, 0, 0],];
		assert(compareMatrix(actualTable, emptyMatrix), "Il tavolo da gioco non è composto come previsto");	

		//Se il match è terminato non deve essere possibile eseguire altre mosse
		try {
			await depl.play(1, 1, 1, {from: playerOne});
		    assert.fail('Expected revert not received');
		  } catch (error) {
		    const revertFound = error.message.search('revert') >= 0;
		    assert(revertFound, 'Expected "revert", got '+error+' instead');
		}
	})

})

function compareMatrix(m1, m2){
	if(m1.length != m2.length) return false;
	if(m1[0].length != m2[0].length) return false;

	for(var i=0; i<m1.length; i++){
		for(var y=0; y<m1[0].length; y++){
			if(m1[i][y] != m2[i][y]) return false;
		}
	}
	return true;
}