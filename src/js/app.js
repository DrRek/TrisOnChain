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
            // TODO: update data relative to account (match)
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
        }
      });

      instance.matchEnded().watch ((err, response) => {
        if(!err){
          //TODO: implement
        }
      });

      instance.nextMove().watch ((err, response) => {
        if(!err){
          //TODO: implement
        }
      });
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

  joinMatch: function(index, address) {
    App.contracts.Tictac.deployed().then(function(instance) {
      instance.joinMatch(index, address);
    }).catch(function(err){
      console.error(err);
    });
  },

  selectSquare: function(column, row) {
    if($("#identificativoPartita").html()==""){
      App.contracts.Tictac.deployed().then(function(instance) {
        instance.createMatch();
      }).catch(function(err){
        console.error(err);
      });
    }else{
      App.contracts.Tictac.deployed().then(function(instance) {
        return instance.play(column, row, { from: userAccount });
      }).then(function(result) {
        // Wait for votes to update
        $("#content").hide();
        $("#loader").show();
      }).catch(function(err) {
        console.error(err);
      });
    }
  }
};

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