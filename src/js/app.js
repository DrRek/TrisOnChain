App = {
  web3Provider: null,
  contracts: {},
  userAccount: null,

  init: function() {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }

    return App.initContract();
  },

  initContract: function(){
    $.getJSON("Tictac.json", function(tictac) {
        // Instantiate a new truffle contract from the artifact
        App.contracts.Tictac = TruffleContract(tictac);
        // Connect provider to interact with contract
        App.contracts.Tictac.setProvider(App.web3Provider);

        var accountInterval = setInterval(function() {
          // Check if account has changed
          if (web3.eth.accounts[0] !== App.userAccount) {
            App.userAccount = web3.eth.accounts[0];

            App.render();
          }
        }, 1000);

        App.listenForEvents();
        App.renderPendingMatches();
        return;
      });
  },

  listenForEvents: function(){
    App.contracts.Tictac.deployed().then(function(instance){
      instance.newProposedMatch().watch ((err, response) => {
        console.log("Evento nuova partita proposta");
        if(!err){
          var partita = [response.args.index, response.args.firstPlayer];
          aggiungiPartitaDisponibile(partita);
        }
      });

      instance.matchJoined().watch ((err, response) => {
        console.log("Evento partita non più disponibile");
        if(!err){
          var partita = [response.args.index, response.args.proposer];
          rimuoviPartitaDisponibile(partita);
          if(response.args.proposer == App.userAccount || response.args.opponent == App.userAccount){
            App.render();
          }
        }
      });

      instance.nextMove().watch ((err, response) => {
        if(!err){
          var id = $("#identificativoPartita").html();
          if(response.args.index == id){
            App.render();
          }
        }
      });

      instance.matchEnded().watch ((err, response) => {
        if(!err){
          var id = $("#identificativoPartita").html();
          if(response.args.index == id){
            if(response.args.winner == App.userAccount){
              alert("You have won the match!");
            }else if(response.args.loser == App.userAccount){
              alert("You have lost the match!"); 
            }
            App.render();
          }
        }
      });
    });
  },

  render: function(){
    $("#warning").hide();
    App.contracts.Tictac.deployed().then(function(instance){
        instance.senderIsNotPlaying().then(function(isNotPlaying){
          $("#loader").hide();
          if(isNotPlaying){
            $("#playing").hide();
            $("#lobby").show();
            App.renderPendingMatches();
          }else{
            $("#lobby").hide();
            $("#playing").show();
            App.renderMatchBoard();
          }
      })
    });
  },

  renderPendingMatches: function(){
    $("#joinableMatchesTable").html("");
    App.contracts.Tictac.deployed().then(function(instance){
      tictacInstance = instance;

      tictacInstance.getRunningMatchesCount().then(function(numeroDiPartiteDisponibili){
        for(var i=1; i<=numeroDiPartiteDisponibili; i++){
          tictacInstance.getRunningMatchAtIndex(i).then( aggiungiPartitaDisponibile);
        }
      })
    });
  },

  renderMatchBoard: function(){
    App.contracts.Tictac.deployed().then(function(instance) {
      instance.matchIndexOfPlayers(App.userAccount).then(function(matchIndex){
        if(matchIndex != 0){
          $("#identificativoPartita").html(matchIndex+"");
          instance.getRunningMatchAtIndex(matchIndex).then(function(infoOfTheMatch){

            var myPlayerIdentifier = 0;
            var giocatoreX = $("#giocatoreX");
            var giocatoreO = $("#giocatoreO");
            giocatoreX.html("Player X");
            giocatoreO.html("Player O");
            if(infoOfTheMatch[1]==App.userAccount){
              myPlayerIdentifier = 1;
              giocatoreX.append(" (You)");
              giocatoreX.css("background-color", "#7FFFD4");
              giocatoreO.css("background-color", "");
            }
            else if(infoOfTheMatch[2]==App.userAccount){
              myPlayerIdentifier = 2;
              giocatoreO.append(" (You)");
              giocatoreO.css("background-color", "#7FFFD4");
              giocatoreX.css("background-color", "");
            }
            giocatoreX.append(" : "+infoOfTheMatch[1]);
            giocatoreO.append(" : "+infoOfTheMatch[2]);

            if(myPlayerIdentifier == infoOfTheMatch[4]){
              $("#warning-text").html("Your opponent is waiting for you to move!");
              $("#warning").show();
              $("#turn").html("It's your turn!");
            }else{
              $("#turn").html("It's your opponent turn!");
            }

            $("#info").show();
          })
          instance.getRunningMatchBoardAtIndex(matchIndex).then(function(boardOfTheMatch){
            for(var i = 0; i < 3; i++){
              for(var y = 0; y < 3; y++){
                if(boardOfTheMatch[i][y] == 1){
                  $("#cell"+i+y).html("X");
                }else if(boardOfTheMatch[i][y] == 2){
                  $("#cell"+i+y).html("O");
                }
              }
            }
          })
        }
      })
    }).catch(function(err){
      console.error(err);
    });
  },

  proposeMatch: function(){
    App.contracts.Tictac.deployed().then(function(instance) {
      instance.createMatch();
    }).catch(function(err){
      console.error(err);
    });
  },

  joinMatch: function(index, address) {
    App.contracts.Tictac.deployed().then(function(instance) {
      instance.joinMatch(index, address).then(function(instance){
        renderMatchBoard();
      });
    }).catch(function(err){
      console.error(err);
    });
  },

  selectSquare: function(column, row) {
    var id = $("#identificativoPartita").html();
    App.contracts.Tictac.deployed().then(function(instance) {
      instance.play(column, row, id);
    }).catch(function(err) {
      console.error(err);
    });
  }
}

function aggiungiPartitaDisponibile(partita){
  if(partita.length==2 || (partita[2]=="0x0000000000000000000000000000000000000000" && !partita[3])){
    var found = false;
    $(".joinableMatchesRow").each(function(index){
      var firstTd = $(this).find(".joinableIndexColumn");
      var secondTd = $(this).find(".joinableAddressColumn");
      if(firstTd.html() == partita[0]){
        secondTd.html(partita[1]);
        found = true;
        return;
      }
    })
    if(!found){
      $("#joinableMatchesTable").append("<tr class='joinableMatchesRow'><td class='joinableIndexColumn'>"+partita[0]+"</td><td class='joinableAddressColumn'>"+partita[1]+"</td><th>" +
        "<form onSubmit='App.joinMatch("+partita[0]+", \""+partita[1]+"\"); return false;'>"+
          "<button type='submit'>Join!</button>"+
        "</form></th></tr>"
      );
    }   
  } 
}

function rimuoviPartitaDisponibile(partita){
  $(".joinableMatchesRow").each(function(index){
      var firstTd = $(this).find(".joinableIndexColumn");
      var secondTd = $(this).find(".joinableAddressColumn");
      if(firstTd.html() == partita[0] && secondTd.html() == partita[1]){
        $(this).remove();
        return;
      }
    })
}

$(function() {
  $(window).load(function() {
    App.init();
  });
});